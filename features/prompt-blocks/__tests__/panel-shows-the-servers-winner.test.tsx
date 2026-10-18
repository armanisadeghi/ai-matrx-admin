/**
 * Defect 39, third sibling: the block chip panel shows what the SERVER says runs. For an agent
 * owned by another organization whose block lives only there, the panel names the agent and shows
 * that block at the agent's-organization rung — it never re-derives the ladder in the browser.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

const AGENT_ORG = "aaaaaaaa-0000-4000-8000-000000000001"; // owns the agent
const ACTIVE_ORG = "bbbbbbbb-0000-4000-8000-000000000002"; // where the person works now
const AGENT_ID = "cccccccc-0000-4000-8000-000000000003";
const BLOCK = {
  id: "dddddddd-0000-4000-8000-000000000004",
  name: "lane_rules",
  label: "Lane rules",
  content: "Default lane rules.",
  description: null,
  organization_id: AGENT_ORG,
  visibility: "internal",
  created_by: "someone-else",
  source_kind: "authored",
  source_ref: null,
  bound_tool: null,
};

const resolveCalls: unknown[] = [];

jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: () => "me-1",
}));
jest.mock("@/lib/toast", () => ({ toast: { warning: () => {}, error: () => {}, success: () => {}, info: () => {} } }));
jest.mock("@ai-matrx/kit/outbound", () => ({ openOutbound: () => {} }));
jest.mock("../service", () => ({
  listBlocksNamed: async () => [BLOCK],
  listVariants: async () => [],
  createBlock: async () => BLOCK,
}));
jest.mock("../resolveBlocks", () => {
  const actual = jest.requireActual("../resolveBlocks");
  return {
    ...actual,
    resolveBlocks: async (_dispatch: unknown, args: unknown) => {
      resolveCalls.push(args);
      return {
        blocks: { lane_rules: "Lane rules from the agent's organization." },
        report: [{ name: "lane_rules", level: "agent_organization", block_id: BLOCK.id, variant_id: null }],
        missing: [],
      };
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BlockChipPanel } = require("../components/BlockChipPanel");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveQueryPath } = jest.requireActual("../resolveBlocks");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const byTestId = (id: string) => document.querySelector(`[data-testid="${id}"]`);

it("an agent owned by another organization shows its own organization's block, as the server resolves it", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(
      <BlockChipPanel
        target={{ name: "lane_rules", rect: new DOMRect(0, 0, 10, 10) }}
        declared
        modelName="claude-haiku-5-5"
        creatorId="someone-else"
        organizationId={AGENT_ORG}
        agentId={AGENT_ID}
        onDeclare={async () => {}}
        onClose={() => {}}
        onChanged={() => {}}
      />,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(resolveCalls).toEqual([expect.objectContaining({ names: ["lane_rules"], agentId: AGENT_ID })]);
  expect(byTestId("prompt-block-panel-level")?.textContent).toBe("Agent's organization");
  expect(byTestId("prompt-block-panel-text")?.textContent).toBe("Lane rules from the agent's organization.");
  expect(byTestId("prompt-block-panel-missing")).toBeNull();
  void ACTIVE_ORG;
  host.remove();
});

it("the resolve call names the agent (and a version), never an organization", () => {
  const path: string = resolveQueryPath({ names: ["lane_rules"], model: "m", agentId: AGENT_ID, agentIsVersion: true });
  const q = new URLSearchParams(path.split("?")[1]);
  expect(q.get("agent_id")).toBe(AGENT_ID);
  expect(q.get("agent_is_version")).toBe("true");
  expect([...q.keys()].some((k) => k.includes("organization"))).toBe(false);
});
