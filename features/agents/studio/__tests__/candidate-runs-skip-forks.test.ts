/** Improve mode opens the agent's latest REAL run: a Debrief fork is never one of its runs. */
const calls: unknown[][] = [];
function chain(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === "then") return (resolve: (v: unknown) => void) => resolve({ data: [], error: null });
        return (...args: unknown[]) => {
          calls.push([prop, ...args]);
          return proxy;
        };
      },
    },
  );
  return proxy;
}
jest.mock("@/utils/supabase/client", () => ({ createClient: () => chain() }));
jest.mock("@/utils/supabase/writeOne", () => ({ writeOne: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));
jest.mock("@ai-matrx/data/db", () => ({ readAllRows: jest.fn(async () => []) }));

import { fetchCandidateRuns } from "@/features/agents/samples/service";

it("reads only runs a person launched: no child conversations, no forks", async () => {
  await fetchCandidateRuns("agent-1");
  expect(calls).toContainEqual(["is", "parent_conversation_id", null]);
  expect(calls).toContainEqual(["is", "forked_from_id", null]);
});
