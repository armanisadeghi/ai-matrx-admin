/**
 * HOST-RUN-2: a job (an agent's copy or import) approved somewhere else says where its run stands — never
 * "The change was made." over a job that has not run.
 */
import { standingSentence } from "../approvalDecision";

const at = "2026-10-17T06:00:00.000Z";
const now = new Date("2026-10-17T06:12:00.000Z");

it("a job approved but not run yet says so", () => {
  expect(standingSentence({ state: "approved", decidedAt: at, decidedByName: "admin", kind: "host_run", runState: null }, now))
    .toMatch(/^Approved by admin .*\. It has not run yet\.$/);
});

it("a job that ran says it ran", () => {
  expect(standingSentence({ state: "approved", decidedAt: at, decidedByName: "admin", kind: "host_run", runState: "done" }, now))
    .toMatch(/It ran\.$/);
});

it("every other change still says it was made", () => {
  expect(standingSentence({ state: "approved", decidedAt: at, decidedByName: "admin", kind: "record_add" }, now))
    .toMatch(/The change was made\.$/);
});
