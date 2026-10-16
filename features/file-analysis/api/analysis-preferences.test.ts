/** Seam test: detector preferences read/write Supabase (users.user_analysis_preferences), not the Python server. */
const state: { row: Record<string, unknown> | null; writes: Array<{ op: string; payload: unknown; eq?: unknown }> } = {
  row: null,
  writes: [],
};
const schemaSpy = jest.fn();
const tableSpy = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: (s: string) => {
      schemaSpy(s);
      return {
        from: (t: string) => {
          tableSpy(t);
          const q: any = {
            select: () => q,
            eq: (...a: unknown[]) => ((q._eq = a), q),
            is: () => q,
            limit: () => q,
            maybeSingle: async () => ({ data: state.row, error: null }),
            update: (payload: unknown) => {
              state.writes.push({ op: "update", payload });
              return { eq: async (...a: unknown[]) => (state.writes[state.writes.length - 1].eq = a, { error: null }) };
            },
            insert: async (payload: unknown) => (state.writes.push({ op: "insert", payload }), { error: null }),
          };
          return q;
        },
      };
    },
  }),
}));
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "user-1" }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: async () => "org-1" }));
const pythonCall = jest.fn();
jest.mock("@/lib/python-client", () => ({
  delJson: pythonCall, getJson: pythonCall, postJson: pythonCall, postNdjson: pythonCall,
}));
jest.mock("@/lib/api/server-api", () => ({ serverApi: {}, callOptionsFrom: () => ({}) }));
jest.mock("@ai-matrx/api/files", () => new Proxy({}, { get: () => jest.fn() }));
jest.mock("@/features/files/api/fileOrganization", () => ({ withFileOrganization: (_f: string, o: unknown) => o }));

import { getAnalysisPreferences, putAnalysisPreferences } from "./file-analysis";

beforeEach(() => {
  state.row = null;
  state.writes = [];
  pythonCall.mockReset();
  schemaSpy.mockClear();
});

it("reads the caller's row from users.user_analysis_preferences", async () => {
  state.row = { per_detector_enabled: { ssn: false }, default_tier_per_detector: { ssn: "high" }, default_redaction_mode: "permanent" };
  const { data } = await getAnalysisPreferences();
  expect(schemaSpy).toHaveBeenCalledWith("users");
  expect(tableSpy).toHaveBeenCalledWith("user_analysis_preferences");
  expect(data).toEqual({ per_detector_enabled: { ssn: false }, default_tier_per_detector: { ssn: "high" }, default_redaction_mode: "permanent" });
  expect(pythonCall).not.toHaveBeenCalled();
});

it("answers the server's defaults when there is no row", async () => {
  const { data } = await getAnalysisPreferences();
  expect(data).toEqual({ per_detector_enabled: {}, default_tier_per_detector: {}, default_redaction_mode: "reversible" });
});

it("insert carries an explicit organization when the person has no row yet", async () => {
  const body = { per_detector_enabled: { a: true }, default_tier_per_detector: {}, default_redaction_mode: "reversible" };
  const { data } = await putAnalysisPreferences(body);
  expect(state.writes[0]).toMatchObject({ op: "insert", payload: { ...body, user_id: "user-1", created_by: "user-1", organization_id: "org-1" } });
  expect(data.status).toBe("saved");
  expect(pythonCall).not.toHaveBeenCalled();
});

it("updates the existing row in place", async () => {
  state.row = { id: "row-9" };
  await putAnalysisPreferences({ per_detector_enabled: { a: false }, default_tier_per_detector: {}, default_redaction_mode: "reversible" });
  expect(state.writes[0].op).toBe("update");
  expect(state.writes[0].eq).toEqual(["id", "row-9"]);
});
