import React, { act } from "react";
import { createRoot } from "react-dom/client";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockReadLive = jest.fn();
const mockReadArchived = jest.fn();
const mockCoverage = jest.fn();
const mockSectionsFromRows = jest.fn((rows: Array<{ id: string }>) => rows.map((row, position) => ({
  id: row.id,
  position,
  title: row.id,
  summary: "",
  body: "",
  facts: [],
  chunkIds: [],
})));

jest.mock("@/lib/redux/hooks", () => ({
  useAppDispatch: () => jest.fn(),
  useAppSelector: () => [],
}));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));
jest.mock("@/features/workflow-runtime/hooks/useWorkflowRun", () => ({ useWorkflowRun: jest.fn() }));
jest.mock("@/features/workflow-runtime/redux/workflow-runs.selectors", () => ({
  selectRunActivity: () => () => [],
  selectRunError: () => () => null,
  selectRunStatus: () => () => null,
}));
jest.mock("@/features/workflow-runtime/types", () => ({ runIsOver: () => false }));
jest.mock("@/features/education/convert/existingItems", () => ({
  readDeckItems: jest.fn().mockResolvedValue([]),
  readQuestionItems: jest.fn().mockResolvedValue([]),
}));
jest.mock("../../kitService", () => ({ promoteAnchorKit: jest.fn() }));
jest.mock("../coverage", () => ({ kitCoverage: mockCoverage }));
jest.mock("../outlineService", () => ({
  builtByRunOf: () => null,
  isOutlineStale: () => false,
  isRunStalled: () => false,
  kitOutlineInputs: jest.fn().mockResolvedValue({ sources: [] }),
  lookupKitOutlineRun: jest.fn().mockResolvedValue(null),
  outlineSectionsFromRows: mockSectionsFromRows,
  readArchivedKitOutlineRows: mockReadArchived,
  readKitOutlineRows: mockReadLive,
  readOutlineBuildSources: jest.fn().mockResolvedValue(null),
  startKitOutline: jest.fn(),
}));

import { useKitOutline, type KitOutlineState } from "../useKitOutline";

function Probe({ onState }: { onState: (state: KitOutlineState) => void }) {
  onState(useKitOutline({
    id: "kit-artifact",
    sourceType: "scope",
    sourceId: "kit-1",
    organizationId: "org-1",
    sources: [],
    artifacts: [],
  } as never));
  return null;
}

describe("useKitOutline archive separation", () => {
  it("feeds only live sections into generation and coverage state", async () => {
    mockReadLive.mockResolvedValue([{ id: "live-section" }]);
    mockReadArchived.mockResolvedValue([{ id: "archived-section" }]);
    mockCoverage.mockReturnValue({ rows: [], unmapped: { cards: 0, questions: 0 }, max: 0 });
    const states: KitOutlineState[] = [];
    const host = document.createElement("div");
    const root = createRoot(host);

    await act(async () => {
      root.render(<Probe onState={(state) => { states.push(state); }} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(states.at(-1)?.sections?.map((section) => section.id)).toEqual(["live-section"]);
    expect(states.at(-1)?.archivedSections?.map((section) => section.id)).toEqual(["archived-section"]);
    expect(mockCoverage).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: "live-section" })]),
      [],
      [],
    );
    expect(mockCoverage.mock.calls.flat().some((value) => value?.id === "archived-section")).toBe(false);

    await act(async () => root.unmount());
  });
});
