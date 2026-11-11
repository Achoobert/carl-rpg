/**
 * Foundry rejects ChatMessage#update()/setFlag() from any user who isn't the
 * message's author or a GM (Document#canUserModify checks OWNER, and only
 * the author + GM hold that by default). Every "Apply"/"Roll Evade" click
 * handler in module/chat/*.mjs needs to write onto a card that's routinely
 * authored by someone else (the GM rolls a Mob's Attack; the defending
 * player clicks the button) - a direct message.setFlag() call from that
 * player silently fails. updateCardMessage is the one write path all of
 * those handlers use instead: apply directly when permitted, otherwise
 * relay the already-computed update payload to the active GM's client,
 * which applies it verbatim (no re-derivation GM-side, so permission logic
 * never has to run twice with a chance of disagreeing).
 */

import { isOneShotDebuff } from "./debuff-effects.mjs";

const SOCKET = "system.carl-rpg";

/**
 * Whether the GM should honor a player's relayed condition removal. Only
 * one-shot Debuffs (Stunned/Queasy/Staggered - the only ones a roll ever
 * consumes) may be removed this way, and only from a creature the sender
 * owns, has targeted, or that is seated in an active Combat (a Taunt's
 * attacking Mob isn't necessarily targeted).
 * @param {User|undefined} sender
 * @param {Actor} actor
 * @param {object} condition  A system.conditions entry.
 * @returns {boolean}
 */
function mayRelayRemove(sender, actor, condition) {
  if (!sender || !isOneShotDebuff(condition.key)) return false;
  if (sender.isGM || actor.testUserPermission(sender, "OWNER")) return true;
  const targeted = [...(sender.targets ?? [])].some((t) => t.actor === actor || t.document?.actorId === actor.id);
  const inCombat = game.combats.some((c) => c.started && c.combatants.some((cb) => cb.actor === actor));
  return targeted || inCombat;
}

/**
 * Register once, from the `ready` hook (needs game.users/game.socket live).
 * Two payload shapes share the one system socket: a ChatMessage update
 * (`{messageId, updates}`, the original and default) and an Actor
 * condition removal (`{type: "removeConditions", actorUuid, conditionIds}`,
 * see relayRemoveConditions below).
 */
export function registerChatSocket() {
  game.socket.on(SOCKET, async (payload = {}, senderId = null) => {
    if (!game.users.activeGM?.isSelf) return;
    if (payload.type === "removeConditions") {
      const doc = await fromUuid(payload.actorUuid);
      const actor = doc instanceof Actor ? doc : doc?.actor;
      if (!actor) return;
      const sender = game.users.get(senderId);
      const ids = new Set(payload.conditionIds ?? []);
      const remaining = (actor.system.conditions ?? [])
        .filter((c) => !ids.has(c.id) || !mayRelayRemove(sender, actor, c));
      if (remaining.length !== (actor.system.conditions ?? []).length) {
        await actor.update({ "system.conditions": remaining });
      }
      return;
    }
    const message = game.messages.get(payload.messageId);
    if (!message) return;
    await message.update(payload.updates);
  });
}

/**
 * Ask the active GM to remove conditions from an actor this user can't
 * update - e.g. a player's Attack consuming a Mob's Stunned debuff
 * (module/helpers/conditions.mjs's removeConditionsById).
 * @param {Actor} actor
 * @param {string[]} conditionIds
 * @returns {boolean} Whether a GM was available to relay to.
 */
export function relayRemoveConditions(actor, conditionIds) {
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("CARLRPG.Chat.NoGMOnline"));
    return false;
  }
  game.socket.emit(SOCKET, { type: "removeConditions", actorUuid: actor.uuid, conditionIds });
  return true;
}

/**
 * @param {ChatMessage} message
 * @param {object} updates  A Document#update payload, e.g. {flags, content}.
 * @returns {Promise<ChatMessage|null>} The updated document when applied
 *   locally; null when relayed to the GM (no local document to return) or
 *   when no GM is connected to relay to.
 */
export async function updateCardMessage(message, updates) {
  if (message.canUserModify(game.user, "update")) return message.update(updates);
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("CARLRPG.Chat.NoGMOnline"));
    return null;
  }
  game.socket.emit(SOCKET, { messageId: message.id, updates });
  return null;
}
