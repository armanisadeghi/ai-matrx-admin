/**
 * A FORM ARCHIVES FROM ITS ROW in the Data home list (NARROW-FIXES item 3). The row menu offered Open
 * and the star only, so a leftover form could not be put away. Break named: archive hides the row, calls
 * the store's `formArchive`, and a refusal puts the row back with the store's own words.
 */
import { archiveFormFromHome, restoreFormFromHome } from "../archiveFormFromHome";

const ok = (sentence: string) => ({ ok: true as const, data: { sentence } });
const refused = (message: string) => ({ ok: false as const, error: { message } });

it("hides the row, archives through the form door, and says the store's sentence", async () => {
  const calls: string[] = [];
  const out = await archiveFormFromHome({
    client: { formArchive: async ({ form_id }: { form_id: string }) => (calls.push(form_id), ok("The form was archived.")) } as never,
    formId: "f1",
    onOptimisticHide: () => void calls.push("hide"),
    onRollback: () => void calls.push("rollback"),
  });
  expect(calls).toEqual(["hide", "f1"]);
  expect(out).toEqual({ outcome: "archived", sentence: "The form was archived." });
});

it("a refusal puts the row back and carries the store's words", async () => {
  const calls: string[] = [];
  const out = await archiveFormFromHome({
    client: { formArchive: async () => refused("Only an admin of the form's table can archive it.") } as never,
    formId: "f1",
    onOptimisticHide: () => void calls.push("hide"),
    onRollback: () => void calls.push("rollback"),
  });
  expect(calls).toEqual(["hide", "rollback"]);
  expect(out).toEqual({ outcome: "refused", sentence: "Only an admin of the form's table can archive it." });
});

it("restore goes through the form's one way back", async () => {
  const out = await restoreFormFromHome({ client: { formRestore: async () => ok("Brought back.") } as never, formId: "f1" });
  expect(out).toEqual({ outcome: "archived", sentence: "Brought back." });
});
