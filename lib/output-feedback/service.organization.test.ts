// Law: common-docs/policies/access-ladder.md rule 4 — every save carries an
// explicit organization_id; the database never picks one.
const rpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    schema: () => ({
      // Awaited directly (the subject-organization read) or through `.returns()` (the upsert).
      // The answer's own row: its organization.
      from: (table: string) => ({
        select: () => ({
          eq: (_c: string, id: string) => ({
            maybeSingle: async () => {
              rowReads.push(`${table}:${id}`);
              return { data: subjectOrg ? { organization_id: subjectOrg } : null, error: null };
            },
          }),
        }),
      }),
      rpc: (...a: unknown[]) => {
        const result = rpc(...a);
        return Object.assign(Promise.resolve(result), { returns: () => result });
      },
    }),
  },
}));
const ensureOrgId = jest.fn();
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: (...a: unknown[]) => ensureOrgId(...a) }));
jest.mock("@ai-matrx/data/db", () => ({ readAllRows: jest.fn() }));

import { saveOutputFeedback } from "./service";

const SAVED_ROW = { id: "f1", subject_type: "message", subject_id: "263550e7-eb60-4e8e-97ee-e19297126ebe", user_id: "u1", created_at: "x", updated_at: "x" };
/** The database's answer to "which organization owns this output?" for the next test. */
let subjectOrg: string | null = null;
const rowReads: string[] = [];

beforeEach(() => {
  subjectOrg = null;
  rowReads.length = 0;
  rpc.mockReset().mockResolvedValue({ data: SAVED_ROW, error: null });
  ensureOrgId.mockReset();
});

it("sends the working organization when the caller names none", async () => {
  ensureOrgId.mockResolvedValue("org-active");
  await saveOutputFeedback({ subjectType: "message", subjectId: "263550e7-eb60-4e8e-97ee-e19297126ebe", verdict: "up" } as never).catch(() => undefined);
  expect(ensureOrgId).toHaveBeenCalledWith(undefined);
  expect(rpc).toHaveBeenCalledWith("upsert_output_feedback", expect.objectContaining({ p_organization_id: "org-active" }));
});

it("sends the subject's own organization when the caller names it", async () => {
  ensureOrgId.mockImplementation(async (id?: string) => id);
  await saveOutputFeedback({
    subjectType: "message",
    subjectId: "263550e7-eb60-4e8e-97ee-e19297126ebe",
    verdict: "up",
    organizationId: "org-record",
  } as never).catch(() => undefined);
  expect(rpc).toHaveBeenCalledWith("upsert_output_feedback", expect.objectContaining({ p_organization_id: "org-record" }));
});

// Break this catches: saving with the ACTIVE organization when the answer lives in another one. The
// RPC refuses that with `organization_conflict` (a 400), and every in-app correction of an answer
// from another organization was silently lost (2026-10-12).
it.each([
  ["Harbor Dental Group's answer", "org-harbor-dental"],
  ["Riverside Clinic's answer", "org-riverside-clinic"],
])("files feedback on %s in that answer's organization, not the active one", async (_label, owner) => {
  subjectOrg = owner;
  ensureOrgId.mockImplementation(async (id?: string) => id ?? "org-active");
  await saveOutputFeedback({
    subjectType: "message",
    subjectId: "263550e7-eb60-4e8e-97ee-e19297126ebe",
    correctedContent: "## Plan",
  } as never);
  expect(rowReads).toEqual(["message:263550e7-eb60-4e8e-97ee-e19297126ebe"]);
  expect(rpc).toHaveBeenCalledWith("upsert_output_feedback", expect.objectContaining({ p_organization_id: owner }));
});
