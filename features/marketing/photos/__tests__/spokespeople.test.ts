/**
 * The Spokesperson switch writes the party -> brand edge through the REAL associations service (the one the
 * app binds), over a fake database client. The service refuses `replaceMetadata` for every edge but file
 * conversation attachments, so the switch must not send it; `assoc_add` already replaces metadata on an
 * existing edge, which is the update we want.
 */

import { createAssociationGuards, createAssociationsService, createRpcResultHelpers } from "@ai-matrx/associations/core";

const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
const real = createAssociationsService({
  dataSource: {
    schema: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { data: "edge-id", error: null };
      },
    }),
  },
  identity: { requireUserId: () => "u1", ensureOrgId: async () => "o1" },
  rpc: createRpcResultHelpers({ onError: () => {} } as never),
  guards: createAssociationGuards({ onError: () => {} } as never),
} as never);

jest.mock("@/features/scopes/service/associationsService", () => ({
  get associationsService() {
    return real;
  },
}));

import { setSpokespersonEdge, type Person } from "../spokespeople";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const brand = { id: uuid(1), organization_id: uuid(2) };
const person: Person = { partyId: uuid(3), name: "Pat", role: "key_person", metadata: { note: "keep" } };

describe("setSpokespersonEdge", () => {
  beforeEach(() => (calls.length = 0));
  it("flips the flag on the existing party -> brand edge, keeping the rest of its metadata", async () => {
    await setSpokespersonEdge(brand, person, true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args).toMatchObject({
      p_source_type: "party",
      p_target_type: "web_brand",
      p_role: "key_person",
      p_metadata: { note: "keep", is_spokesperson: true },
    });
  });
});
