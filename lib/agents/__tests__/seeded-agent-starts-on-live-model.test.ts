/**
 * A seeded agent is written on a LIVE model (Lane D walk, 2026-10-21). A seed that names a model which
 * has since been superseded must be written as its live successor; written as is, the builder's picker
 * healed it on first view and the unsaved-changes diff showed a model change nobody made.
 *
 * The model a NEW agent starts on is no longer a constant: the blank seed pins none (it comes from the
 * `agents.model_prefs.agent_authoring_default_model` knob through `resolveNewAgentModelId`), so the
 * superseded id below is test data on a seed, never read from the package.
 */
const inserted: Array<Record<string, unknown>> = [];
const catalog: Record<string, { id: string; is_deprecated: boolean; retired_at: string | null; successor_id: string | null }> = {
  "617abdcd-79e2-4a4b-be76-4a9960cdffa1": { id: "617abdcd-79e2-4a4b-be76-4a9960cdffa1", is_deprecated: true, retired_at: null, successor_id: "3f1c9a52-7b4e-4d2a-9c61-5e8a0b2d7f15" },
  "3f1c9a52-7b4e-4d2a-9c61-5e8a0b2d7f15": { id: "3f1c9a52-7b4e-4d2a-9c61-5e8a0b2d7f15", is_deprecated: false, retired_at: null, successor_id: null },
};
const fakeSupabase = {
  schema: (name: string) => ({
    from: (table: string) => ({
      select: () => ({ in: async (_c: string, ids: string[]) => ({ data: name === "ai" && table === "model_public" ? ids.map((id) => catalog[id]).filter(Boolean) : [], error: null }) }),
      insert: (row: Record<string, unknown>) => {
        inserted.push(row);
        return { select: () => ({ single: async () => ({ data: { id: "new-agent" }, error: null }) }) };
      },
    }),
  }),
};
jest.mock("@/utils/supabase/server", () => ({ createClient: async () => fakeSupabase }));
jest.mock("@/utils/supabase/claimsUser", () => ({ getClaimsUser: async () => ({ data: { user: { id: "me" } }, error: null }) }));
jest.mock("@/utils/auth/adminLaneServer", () => ({ hasAdminPower: async () => false }));
jest.mock("@/utils/auth/server-login-href", () => ({ currentRequestLoginHref: async () => "/login" }));
jest.mock("next/navigation", () => ({ redirect: (to: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { to }); } }));

import { createAgentFromSeed } from "@/lib/agents/actions";
import { BLANK_AGENT_SEED } from "@ai-matrx/chat/agents/constants/blank-agent";

describe("a seeded agent is written on a live model", () => {
  it("a seed's superseded model is written as its live successor", async () => {
    inserted.length = 0;
    await expect(createAgentFromSeed({ ...BLANK_AGENT_SEED, modelId: "617abdcd-79e2-4a4b-be76-4a9960cdffa1" }, "org-1")).rejects.toMatchObject({ to: "/agents/new-agent/build" });
    expect(inserted[0]?.model_id).toBe("3f1c9a52-7b4e-4d2a-9c61-5e8a0b2d7f15");
  });

  it("the blank seed pins no model: the knob decides where the agent is created", () => {
    expect(BLANK_AGENT_SEED.modelId).toBeUndefined();
  });
});
