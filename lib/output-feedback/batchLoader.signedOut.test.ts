/**
 * Signed out there is no session, so `platform.output_feedback` answers 401 (live /chat, 2026-10-22).
 * The loader asks nothing, records no "no verdict" answer, and lets the subject load once a session exists.
 */
const fetchOutputFeedbackForSubjects = jest.fn(async (_t: string, _ids: string[]) => []);
let session = false;
jest.mock("./service", () => ({
  fetchOutputFeedbackForSubjects: (t: string, ids: string[]) => fetchOutputFeedbackForSubjects(t, ids),
}));
jest.mock("@/lib/supabase/hasBrowserSession", () => ({ hasBrowserSession: async () => session }));

import { loadOutputFeedback } from "./batchLoader";
import { peekOutputFeedback } from "./store";

const ID = "2cc5fdfd-b7f1-48f1-a43e-c12ac35ac0c4";
async function flush(): Promise<void> {
  jest.advanceTimersByTime(50);
  for (let i = 0; i < 6; i++) await Promise.resolve();
}
beforeEach(() => { jest.useFakeTimers(); fetchOutputFeedbackForSubjects.mockClear(); });
afterEach(() => { jest.useRealTimers(); });

it("asks nothing signed out, then loads once a session exists", async () => {
  session = false;
  loadOutputFeedback("message", ID);
  await flush();
  expect(fetchOutputFeedbackForSubjects).not.toHaveBeenCalled();
  expect(peekOutputFeedback({ subjectType: "message", subjectId: ID })).toBeUndefined();
  session = true;
  loadOutputFeedback("message", ID);
  await flush();
  expect(fetchOutputFeedbackForSubjects).toHaveBeenCalledTimes(1);
});
