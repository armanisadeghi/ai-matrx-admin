/**
 * 2026-10-10: a dropped knob read ("Failed to fetch") with no organization was reported as
 * "platform.knob_snapshot_delta could not answer for organization='null': … A 42501 here means the
 * signed-in person is not a member of that organization", which another agent read as "knob reads
 * return 42501 when the organization is null". With no organization the server answers (the
 * a-knob-resolves-with-no-organization test); the sentence must say what actually failed.
 */
import { snapshotFailureSentence } from "../effectiveKnobs";

jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/client-directives/directiveRegistry", () => ({ registerDirectiveHandler: jest.fn() }));

const ORG = "11111111-1111-4111-8111-111111111111";

it("a dropped request with no organization never claims a 42501 or an organization 'null'", () => {
  const text = snapshotFailureSentence(null, { message: "TypeError: Failed to fetch" });
  expect(text).not.toMatch(/42501/);
  expect(text).not.toMatch(/organization='null'/);
  expect(text).not.toMatch(/not a member/);
  expect(text).toMatch(/Failed to fetch/);
  expect(text).toMatch(/no organization/);
});

it("a real 42501 for a named organization says membership", () => {
  const text = snapshotFailureSentence(ORG, { message: "platform.knob_snapshot: not a member of that organization", code: "42501" });
  expect(text).toMatch(/\[42501\]/);
  expect(text).toMatch(/not a member of that organization; the read is gated/);
  expect(text).toContain(ORG);
});

it("a real 42501 with no organization names the signed-out read, never membership", () => {
  const text = snapshotFailureSentence(null, { message: "permission denied for function knob_snapshot_delta", code: "42501" });
  expect(text).toMatch(/signed-out visitor/);
  expect(text).not.toMatch(/member of that organization/);
});
