/**
 * @jest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";

const base = (n: number, snapshotLoaded: boolean, withDiff: boolean) => ({
  version_id: `v-${n}`,
  version_number: n,
  changed_at: "2026-10-01T00:00:00Z",
  change_note: null,
  snapshotLoaded,
  ...(withDiff ? { diffSummary: { root: [] } } : {}),
});

let enriched: ReturnType<typeof base>[] = [];
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function text() {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(<VersionHistoryTimeline agentId="a1" versions={versions} currentVersion={2} onCompare={() => {}} />);
  });
  const out = el.textContent ?? "";
  await act(async () => root.unmount());
  el.remove();
  return out;
}

jest.mock("@/features/agents/hooks/useSmartVersionFetch", () => ({
  useSmartVersionFetch: () => ({
    enrichedVersions: enriched,
    loading: false,
    progress: { fetched: 0, total: 0 },
    failedVersions: [],
    failureReason: null,
    fetchEnrichedHistory: jest.fn(),
    fetchGap: jest.fn(),
  }),
}));
jest.mock("@/features/agents/hooks/useAgentDuplicateFlow", () => ({
  useAgentDuplicateFlow: () => ({ openDuplicate: jest.fn(), isDuplicating: false, dialog: null }),
}));
jest.mock("@ai-matrx/chat/host/db", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("@ai-matrx/chat/host/notify", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("@ai-matrx/chat/host/ui-slots", () => ({ ErrorAlchemyMenu: () => null }));

import { VersionHistoryTimeline } from "../VersionHistoryTimeline";

const versions = [{ version_number: 2 }, { version_number: 1 }] as never;

describe("version history says when a version's changes were not read", () => {
  it("preview (before Load Full History) says Not loaded beside the contract button", async () => {
    enriched = [base(2, false, false), base(1, false, false)];
    expect(await text()).toContain("Not loaded");
  });

  it("enriched view says Not loaded for a version whose snapshot was never read", async () => {
    enriched = [base(2, true, true), base(1, false, false)];
    expect(await text()).toContain("Not loaded");
  });
});
