/** ADVERSARIAL-8 F3: only the import run's own state ends the wait; its kept last word is the answer. */
import { FINISHED_WITHOUT_REPORT, LOST_AND_NOT_FOUND, followImportRun, type ImportRunState } from "../notionImportRejoin";

function clock() {
  let t = 0;
  return { now: () => t, wait: async (ms: number) => void (t += ms) };
}

it("reads through a running run and a failed read, then answers the kept report", async () => {
  const answers: Array<ImportRunState | null | Error> = [
    { status: "running", error: null, end: null },
    new Error("statement timeout"),
    { status: "completed", error: null, end: { type: "notion_import.finished", run: "r" } },
  ];
  const c = clock();
  const read = jest.fn(async () => {
    const a = answers.shift();
    if (a instanceof Error) throw a;
    return a ?? null;
  });
  await expect(followImportRun("req", { read, ...c })).resolves.toEqual({ kind: "end", end: { type: "notion_import.finished", run: "r" } });
  expect(read).toHaveBeenCalledTimes(3);
});

it("a failed run with no kept word says the run's own error", async () => {
  const c = clock();
  const read = async () => ({ status: "failed", error: "The worker stopped.", end: null });
  await expect(followImportRun("req", { read, ...c })).resolves.toEqual({ kind: "failed", message: "The worker stopped." });
});

it("a completed run with no kept word says where the report is; a run never opened is said, not waited on forever", async () => {
  const c = clock();
  await expect(followImportRun("req", { read: async () => ({ status: "completed", error: null, end: null }), ...c })).resolves.toEqual({
    kind: "failed",
    message: FINISHED_WITHOUT_REPORT,
  });
  const c2 = clock();
  await expect(followImportRun("req", { read: async () => null, ...c2, notFoundMs: 10_000, everyMs: 4_000 })).resolves.toEqual({
    kind: "failed",
    message: LOST_AND_NOT_FOUND,
  });
});
