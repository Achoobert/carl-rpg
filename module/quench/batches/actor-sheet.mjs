import { createTestCharacter, createTestItem, deleteTestActor, settle, useQuenchTimeout, waitFor } from "../helpers.mjs";

export default function register(quench) {
  quench.registerBatch(
    "carl-rpg.actor-sheet",
    (context) => {
      const { describe, it, assert } = context;

      describe("re-render keeps the active tab's scroll position", function () {
        useQuenchTimeout(this);

        for (const tabId of ["abilities", "items"]) {
          it(`${tabId}: editing a field does not jump back to the top`, async function () {
            const actor = await createTestCharacter();
            const sheet = actor.sheet;
            try {
              // Enough rows that every tab overflows the 680px window.
              for (let i = 0; i < 25; i++) await createTestItem(actor, "item", `scroll ${i}`);
              await sheet.render({ force: true });
              await waitFor(() => sheet.rendered && sheet.element.querySelector(`section.tab[data-tab="${tabId}"]`));
              sheet.changeTab(tabId, "primary");
              await settle(50);

              const before = sheet.element.querySelector(`section.tab[data-tab="${tabId}"]`);
              assert.isAbove(before.scrollHeight, before.clientHeight, `${tabId} tab must overflow for this test to mean anything`);
              before.scrollTop = 150;
              assert.equal(before.scrollTop, 150);

              const log = [];
              const q = () => sheet.element.querySelector(`section.tab[data-tab="${tabId}"]`);
              const snap = (tag, el = q()) => log.push(`${tag}: top=${el?.scrollTop} cls=${el?.className} h=${el?.clientHeight}/${el?.scrollHeight}`);
              const origSync = sheet._syncPartState.bind(sheet);
              sheet._syncPartState = (partId, n, p, st) => { snap(`preSync ${partId}`, n); origSync(partId, n, p, st); if (partId === tabId) snap(`postSync ${partId}`, n); };
              const origOnRender = sheet._onRender.bind(sheet);
              sheet._onRender = async (c, o) => { snap("onRender start"); await origOnRender(c, o); snap("onRender end"); };
              await actor.update({ "system.biography": `scroll ${foundry.utils.randomID()}` });
              await waitFor(() => sheet.element.querySelector(`section.tab[data-tab="${tabId}"]`) !== before, {
                message: "sheet never re-rendered the tab part",
              });
              await settle(50);

              const after = sheet.element.querySelector(`section.tab[data-tab="${tabId}"]`);
              snap("final");
              assert.equal(after.scrollTop, 150, log.join(" | "));
            } finally {
              await sheet.close();
              await deleteTestActor(actor);
            }
          });
        }
      });
    },
    { displayName: "CarlRPG: Actor Sheet" },
  );
}
