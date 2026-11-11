import { processRoundEnd, processCombatEnd } from "../helpers/round-end.mjs";

/**
 * Combat document for Carl RPG - hooks Debuff automation into Foundry's own
 * round lifecycle (module/helpers/round-end.mjs). Combat#_onEndRound runs on
 * exactly one designated GM client, after the round-advance update, once per
 * round ended (including rounds skipped by jumping ahead) and never on a
 * rewind - so no hand-rolled updateCombat bookkeeping is needed here.
 */
export class CarlRPGCombat extends Combat {
  /** @override */
  async _onEndRound(context) {
    await super._onEndRound(context);
    // Starting a combat "ends" round 0 - nothing has happened yet.
    if (!(context?.round >= 1)) return;
    await processRoundEnd(this, context.round);
  }

  /** @override */
  _onDelete(options, userId) {
    super._onDelete(options, userId);
    // _onDelete runs on every client; only the active GM cleans up, and only
    // for a combat that actually started.
    if (!game.user.isActiveGM || !this.started) return;
    void processCombatEnd(this);
  }
}
