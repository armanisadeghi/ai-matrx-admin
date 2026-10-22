/**
 * The review queues answer "what is waiting for ME", across every organization
 * the person can reach — never just the header's selected one. The organization
 * is an OPTIONAL explicit filter; without it no `organization_id` narrowing is
 * applied (access decides, via RLS).
 */

const eqCalls: Array<[string, unknown]> = [];
let heldRows: unknown[] = [];

function builder(): unknown {
  const b: Record<string, unknown> = {};
  for (const method of ["select", "is", "not", "order", "range", "or", "in"]) {
    b[method] = () => b;
  }
  b.eq = (column: string, value: unknown) => {
    eqCalls.push([column, value]);
    return b;
  };
  return b;
}

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    schema: () => ({ from: () => builder() }),
  }),
}));
jest.mock("@/utils/supabase/writeOne", () => ({ writeOne: jest.fn() }));
jest.mock("@/features/commerce-intake/service", () => ({
  listArtifactsForAssets: jest.fn(async () => new Map()),
}));
jest.mock("@ai-matrx/data/db", () => ({
  guardedUpdate: jest.fn(),
  // Run the page function once so the query chain is built, return no rows.
  readAllRows: async (
    page: (range: { from: number; to: number }) => unknown,
    opts?: { label?: string },
  ) => {
    page({ from: 0, to: 9 });
    return opts?.label === "commerce.intake_asset[blocked]" ? heldRows : [];
  },
}));

import { listAttentionQueue, listDraftQueue, listTriageQueue } from "../service";

describe("commerce review queues", () => {
  beforeEach(() => {
    eqCalls.length = 0;
    heldRows = [];
  });

  it.each([
    ["triage", () => listTriageQueue()],
    ["draft", () => listDraftQueue()],
    ["attention", () => listAttentionQueue()],
  ])("%s queue applies no organization narrowing by default", async (_name, run) => {
    await run();
    expect(eqCalls.some(([column]) => column === "organization_id")).toBe(false);
  });

  it("an explicit organization filter still narrows (the on-page control)", async () => {
    await listTriageQueue("org-1");
    expect(eqCalls).toContainEqual(["organization_id", "org-1"]);
  });

  it("an asset the pipeline holds shows up with its reason", async () => {
    heldRows = [
      {
        id: "asset-1",
        organization_id: "org-1",
        pipeline_state: "drafting",
        blocked_reason: "Waiting for the listing mandates",
        updated_at: "2026-10-22T10:00:00Z",
      },
    ];
    const items = await listAttentionQueue();
    expect(items).toContainEqual(
      expect.objectContaining({
        kind: "blocked_asset",
        assetId: "asset-1",
        detail: "Waiting for the listing mandates",
      }),
    );
  });
});
