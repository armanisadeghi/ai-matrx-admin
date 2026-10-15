/** MKT-057: the Background work row reads what the server's post-history step said per account. */
jest.mock("@/utils/supabase/client", () => ({ supabase: {} }));
import { accountKey, postHistoryNotes } from "../postHistoryOutcomes";

describe("postHistoryNotes", () => {
  it("reads a failed step's accounts from its error details, newest outcome winning", () => {
    const notes = postHistoryNotes([
      {
        completed_at: "2026-10-14T10:00:00Z",
        output: {},
        error: { details: { accounts: [{ handle_or_url: "@Sightglass", error: "Instagram refused (401)" }] } },
      },
      {
        completed_at: "2026-10-14T09:00:00Z",
        output: { accounts: [{ handle_or_url: "@sightglass", posts_received: 0, notes: [] }] },
        error: null,
      },
    ]);
    expect(notes.get(accountKey("sightglass"))?.error).toBe("Instagram refused (401)");
  });

  it("ignores an account the step skipped", () => {
    const notes = postHistoryNotes([
      { completed_at: "x", output: { accounts: [{ handle_or_url: "@a", skipped: "undone" }] }, error: null },
    ]);
    expect(notes.size).toBe(0);
  });
});
