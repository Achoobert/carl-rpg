import { buildLootItemData, generateMagicItem } from "./loot.mjs";

/**
 * Loot Box Actor (module/data/loot-box.mjs) behavior: the GM rolls loot into
 * a box, then any player takes items out of it into a Character they own.
 *
 * Players only hold Observer on a box, so they can't delete its Items
 * themselves. takeLootItem moves an item directly when the user owns both
 * ends (the GM, usually), and otherwise relays the request to the active GM
 * - same pattern as module/helpers/chat-socket.mjs, on the same socket
 * channel, told apart by the `action` field.
 */

const SOCKET = "system.carl-rpg";
const TAKE_ACTION = "takeLootItem";

/** Register once, from the `ready` hook (needs game.users/game.socket live). */
export function registerLootBoxSocket() {
  game.socket.on(SOCKET, async (payload) => {
    if (payload?.action !== TAKE_ACTION) return;
    if (!game.users.activeGM?.isSelf) return;
    const user = game.users.get(payload.userId);
    const item = await fromUuid(payload.itemUuid);
    const actor = await fromUuid(payload.actorUuid);
    if (!user || !item || !actor) return;
    // Re-check on the GM side: the relay must not let a player pull from a
    // box they can't see, or push loot into someone else's Character.
    if (!item.parent?.testUserPermission(user, "OBSERVER")) return;
    if (!actor.testUserPermission(user, "OWNER")) return;
    await moveLootItem(item, actor);
  });
}

/**
 * Is this Item sitting in a Loot Box?
 * @param {Item} item
 * @returns {boolean}
 */
export function isLootBoxItem(item) {
  return item?.parent?.documentName === "Actor" && item.parent.type === "lootBox";
}

/**
 * Take one Item out of a Loot Box and give it to an Actor.
 * @param {Item} item   An Item embedded in a Loot Box.
 * @param {Actor} actor The receiving Actor; the current user must own it.
 * @returns {Promise<Item|null>} The new Item when moved locally; null when
 *   relayed to the GM, or refused.
 */
export async function takeLootItem(item, actor) {
  if (!isLootBoxItem(item) || !actor || actor.uuid === item.parent.uuid) return null;
  if (!actor.isOwner) {
    ui.notifications.warn(game.i18n.format("CARLRPG.LootBox.NotYourActor", { name: actor.name }));
    return null;
  }
  if (item.parent.isOwner) return moveLootItem(item, actor);
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize("CARLRPG.LootBox.NoGMOnline"));
    return null;
  }
  game.socket.emit(SOCKET, {
    action: TAKE_ACTION,
    userId: game.user.id,
    itemUuid: item.uuid,
    actorUuid: actor.uuid,
  });
  return null;
}

/**
 * Delete from the box first, then create on the receiver: if two players
 * grab the same item at once, the second delete finds nothing and stops
 * there instead of handing out a copy.
 * @param {Item} item
 * @param {Actor} actor
 * @returns {Promise<Item|null>}
 */
async function moveLootItem(item, actor) {
  const box = item.parent;
  const data = item.toObject();
  delete data._id;
  const deleted = await box.deleteEmbeddedDocuments("Item", [item.id]);
  if (!deleted.length) return null;
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  ChatMessage.create({
    content: game.i18n.format("CARLRPG.LootBox.Taken", {
      actor: actor.name,
      item: data.name,
      box: box.name,
    }),
    speaker: ChatMessage.getSpeaker({ actor }),
  });
  return created ?? null;
}

/**
 * Roll the box's tier `crawlers` times and add each result as a gear Item.
 * @param {Actor} box A Loot Box.
 * @returns {Promise<Item[]>}
 */
export async function generateLootBoxItems(box) {
  const itemData = [];
  for (let i = 0; i < box.system.crawlers; i++) {
    const result = await generateMagicItem(box.system.tier);
    if (!result) break;
    itemData.push(buildLootItemData(result));
  }
  if (!itemData.length) return [];
  return box.createEmbeddedDocuments("Item", itemData);
}

/**
 * Replace one loot Item with a fresh roll at the box's current tier. Keeps
 * the Item (same id, image and anything else the GM set) and only rewrites
 * its name, description and tier flag.
 * @param {Item} item An Item in a Loot Box.
 * @returns {Promise<Item|null>}
 */
export async function rerollLootItem(item) {
  if (!isLootBoxItem(item)) return null;
  const result = await generateMagicItem(item.parent.system.tier);
  if (!result) return null;
  const { name, system, flags } = buildLootItemData(result);
  return item.update({ name, "system.description": system.description, flags });
}
