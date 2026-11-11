import {
  createTestCharacter,
  createTestItem,
  deleteTestActor,
  settle,
  useQuenchTimeout,
  waitFor,
} from "../helpers.mjs";

export default function register(quench) {
  quench.registerBatch(
    "carl-rpg.actor-sheet",
    (context) => {
      const { describe, it, assert } = context;

      describe("re-render keeps the active tab's scroll position", function () {
        useQuenchTimeout(this);

        it("renders the active tab part with the active class", async function () {
          const actor = await createTestCharacter();
          const sheet = actor.sheet;
          try {
            await sheet.render({ force: true });
            await waitFor(() => sheet.rendered);
            sheet.changeTab("description", "primary");
            await sheet.render({ parts: ["description"] });
            const section = sheet.element.querySelector('section.tab[data-tab="description"]');
            assert.isTrue(section.classList.contains("active"));
          } finally {
            await sheet.close();
            await deleteTestActor(actor);
          }
        });

        it("editing the actor does not jump the Inventory tab back to the top", async function () {
          const actor = await createTestCharacter();
          const sheet = actor.sheet;
          try {
            // Enough rows that the Inventory tab overflows the 680px window.
            for (let i = 0; i < 25; i++) await createTestItem(actor, "item", `scroll ${i}`);
            await sheet.render({ force: true });
            await waitFor(() => sheet.rendered);
            sheet.changeTab("items", "primary");
            await settle(50);

            const before = sheet.element.querySelector('section.tab[data-tab="items"]');
            assert.isAbove(
              before.scrollHeight,
              before.clientHeight,
              "Inventory tab must overflow for this test to mean anything",
            );
            before.scrollTop = 150;

            await actor.update({ "system.biography": `scroll ${foundry.utils.randomID()}` });
            await waitFor(
              () => sheet.element.querySelector('section.tab[data-tab="items"]') !== before,
              {
                message: "sheet never re-rendered the Inventory part",
              },
            );
            await settle(50);

            const after = sheet.element.querySelector('section.tab[data-tab="items"]');
            assert.equal(after.scrollTop, 150);
          } finally {
            await sheet.close();
            await deleteTestActor(actor);
          }
        });
      });
    },
    { displayName: "CarlRPG: Actor Sheet" },
  );
}
