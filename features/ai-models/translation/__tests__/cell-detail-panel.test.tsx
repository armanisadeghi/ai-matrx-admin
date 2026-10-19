/**
 * The admin cell panel: the confidence verdict waits for the PLATFORM threshold
 * (never a hard-coded default), says so while reading, and names a failed read
 * with no verdict; evidence is open (never behind a click); no money is drawn.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CellDetailPanel from "../components/CellDetailPanel";
import type { TranslationCellRow } from "../types";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const readConfidenceThreshold = jest.fn();
const readTranslationCellDetail = jest.fn();
jest.mock("../data", () => ({
  readConfidenceThreshold: () => readConfidenceThreshold(),
  readTranslationCellDetail: (id: string) => readTranslationCellDetail(id),
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null }));
jest.mock("@/lib/api/useServerOrganizationId", () => ({ useServerOrganizationId: () => null }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/lib/toast", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
  recordToast: { info: jest.fn() },
}));

const CELL: TranslationCellRow = {
  id: "2104f671-64b9-497d-a563-b79d93538f5d",
  layer: "offering",
  layer_owner_id: "00000000-0000-0000-0000-000000000001",
  setting_key: "reasoning_effort",
  rule: { native_key: "reasoning_effort" } as TranslationCellRow["rule"],
  state: "proposed",
  confidence: 0.6,
  rationale: "Because.",
  evidence: [],
  source: "agent",
  conflict: null,
  rejection_fingerprint: null,
  approved_by: null,
  approved_at: null,
  version: 1,
  updated_at: "2026-10-03T23:42:00Z",
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null;
  host = null;
  jest.clearAllMocks();
});

async function render(cell = CELL) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    root!.render(
      <QueryClientProvider client={client}>
        <CellDetailPanel cell={cell} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const text = () => host!.textContent ?? "";
const confidence = () => host!.querySelector('[data-testid="translation-confidence"]')?.textContent ?? "";

beforeEach(() => {
  readTranslationCellDetail.mockResolvedValue({
    id: CELL.id,
    state: "proposed",
    evidence: [
      { kind: "probe", at: "2026-10-18T10:00:00Z", ref: "https://docs.example.com/x", result: { outcome: "accepted", conversation_id: "105adb24-07e8-443c-9682-62034d7e988e" } },
      { date: "2026-10-18", "model_definition.capabilities.features": "web_search" },
    ],
    metadata: { origin: "seed" },
    created_at: "2026-10-03T16:33:00Z",
    created_by: null,
    updated_by: null,
  });
});

describe("confidence threshold", () => {
  it("while the platform threshold is reading: says so, no verdict", async () => {
    readConfidenceThreshold.mockReturnValue(new Promise(() => {}));
    await render();
    expect(confidence()).toContain("60%");
    expect(confidence()).toContain("Reading the threshold");
    expect(confidence()).not.toMatch(/Meets threshold|Below threshold/);
  });
  it("a failed read: 'Could not read the threshold', no verdict", async () => {
    readConfidenceThreshold.mockRejectedValue(new Error("permission denied"));
    await render();
    expect(confidence()).toContain("Could not read the threshold");
    expect(confidence()).not.toMatch(/Meets threshold|Below threshold|90%/);
  });
  it("answered: verdict against the platform value", async () => {
    readConfidenceThreshold.mockResolvedValue(0.5);
    await render();
    expect(confidence()).toContain("threshold 50%");
    expect(confidence()).toContain("Meets threshold");
  });
});

describe("nothing hidden", () => {
  it("evidence entries, malformed ones included, are open; metadata keys shown; no dollars", async () => {
    readConfidenceThreshold.mockResolvedValue(0.9);
    await render();
    expect(host!.querySelectorAll('[data-testid="translation-evidence-entry"]').length).toBe(2);
    expect(text()).toContain("model_definition.capabilities.features");
    expect(text()).toContain("web_search");
    expect(text()).toContain("https://docs.example.com/x");
    expect(text()).toContain("Metadata: origin");
    expect(text()).toContain("No agent run recorded for this draft");
    expect(text()).toContain("Proven by a passing live test");
    expect(text()).not.toContain("$");
    const chat = host!.querySelector('a[href="/administration/chat/cx-dashboard/conversations/105adb24-07e8-443c-9682-62034d7e988e"]');
    expect(chat).not.toBeNull();
    expect(chat!.getAttribute("target")).toBe("_blank");
  });
});
