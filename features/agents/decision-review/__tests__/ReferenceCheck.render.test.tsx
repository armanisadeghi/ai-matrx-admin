/** @jest-environment jsdom */
/**
 * The reference check as a person sees it, from the live rows of the News Relevance
 * Check agent (2026-10-17): the State column tells the items apart, and the drill-in
 * puts both answers and the label buttons before the long judged input.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { MatrxDataTableProps } from "@ai-matrx/design-system/data-table";
import type { MatrxDataTableMobileCardControls } from "@ai-matrx/design-system/data-table/types";
import { readReviewItem, type ReviewItem } from "../queue";
import type { ReferenceResultRow, ReferenceVerdict } from "../reference";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const tables: Record<string, MatrxDataTableProps<ReferenceResultRow>> = {};

jest.mock("@ai-matrx/design-system/data-table", () => ({
  MatrxDataTable: (props: MatrxDataTableProps<ReferenceResultRow>) => {
    tables[props.tableId ?? ""] = props;
    return <div data-testid={props.tableId} />;
  },
}));
jest.mock("@ai-matrx/chat/agents/decision-answers/DecisionAnswers", () => ({
  DecisionAnswers: () => <div data-testid="answer-card" />,
}));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => null }));
jest.mock("@/components/ui/loaders/Spinner", () => ({ Spinner: () => null }));
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => jest.fn() }));
jest.mock("@/lib/api/resume-or-rejoin", () => ({ rejoinOperationThunk: jest.fn() }));
jest.mock("../components/ReliabilityCurve", () => ({ ReliabilityCurve: () => null }));

const INTRO = "Judge this one news signal against this one client profile and answer the six questions.";
const turn = (title: string) => [
  `${INTRO}\n\n## Signal (news_signal)\n{"id": "x", "title": "${title}", "lane": "profile_relevance"}\n\n## Client context (news_client_context)\n{"__kind": "news_client_context", "company": {"name": "All Green Recycling"}}\n\nAnswer all six questions with calibrated probabilities. Return no prose.`,
];
const TITLES: Record<string, string> = {
  is_news: "Just FYI, when they say it's built to be recycled, it's largely marketing.",
  safety_risk: "AT-RACK to Highlight Mobile Destruction System | News By Wire",
  profile_bridge: "Namespace raised a $42M Series B led by Scale Venture Partners",
};

function liveItem(id: string, question: string): ReviewItem {
  return readReviewItem({
    id,
    judge_key: "agent:46da071d-2b59-415b-b8f5-434f43cdb7d6",
    organization_id: "org",
    question,
    judge_version: 2,
    model: "jev-1.13.0",
    verdict: "false",
    confidence: 0.96,
    authority_verdict: null,
    agreed: null,
    subject_ref_id: `msg-${id}`,
    created_at: "2026-10-07T21:10:01Z",
    metadata: {
      answer_type: "noul",
      answer: false,
      probability: 0.04,
      p_answer: 0.96,
      options: [
        { key: "true", label: "Yes" },
        { key: "false", label: "No" },
      ],
      method: "native",
      instructions: "This signal is a reported news item, not a documentation page or evergreen explainer.",
      conversation_id: `conv-${id}`,
    },
  });
}

const ITEMS = [liveItem("i1", "is_news"), liveItem("i2", "safety_risk"), liveItem("i3", "profile_bridge")];
const VERDICTS: ReferenceVerdict[] = ITEMS.map((it) => ({
  id: `ref-${it.id}`,
  status: "answered",
  reason: null,
  itemId: it.id,
  runId: "run",
  referenceModel: "claude-sonnet-5-5",
  method: "verbalized",
  answer: "false",
  pAnswer: 0.97,
  agree: true,
  costUsd: 0.0081,
  latencyMs: 2500,
  createdAt: "2026-10-17T02:03:59Z",
  probability: 0.03,
  probabilities: null,
  legend: null,
  rawAnswer: false,
}));

jest.mock("../service", () => ({
  loadReferenceVerdicts: jest.fn(async () => VERDICTS),
  loadItemsByIds: jest.fn(async () => ITEMS),
  loadJudgedStates: jest.fn(async () => new Map(ITEMS.map((it) => [it.id, turn(TITLES[it.question] ?? "")]))),
  loadJudgedState: jest.fn(async () => ({ parts: turn("x"), visible: true })),
  labelItem: jest.fn(),
  openReferenceRun: jest.fn(),
  quoteReferenceRun: jest.fn(),
}));

import { ReferenceCheck } from "../components/ReferenceCheck";

describe("ReferenceCheck on the live rows", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    await act(async () => {
      root.render(<ReferenceCheck agentId="agent" facets={null} referenceGroups={[]} onRunSettled={() => {}} />);
    });
    await act(async () => {});
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it("shows what tells each item apart in the State column, never the shared intro", () => {
    const table = tables["agents/decision-review/reference-results"];
    expect(table).toBeDefined();
    const snippets = (table?.data ?? []).map((r) => r.snippet);
    expect(new Set(snippets).size).toBe(3);
    expect(snippets).toEqual(expect.arrayContaining(Object.values(TITLES)));
    expect(snippets.some((s) => s?.startsWith("Judge this one"))).toBe(false);
  });

  it("puts both answers and the label buttons before the judged input", async () => {
    const table = tables["agents/decision-review/reference-results"]!;
    const row = table.data![0]!;
    const drill = document.createElement("div");
    document.body.append(drill);
    const drillRoot = createRoot(drill);
    await act(async () => {
      drillRoot.render(<>{table.detail && "render" in table.detail ? table.detail.render?.(row) : null}</>);
    });
    const text = drill.textContent ?? "";
    expect(drill.querySelectorAll('[data-testid="answer-card"]')).toHaveLength(2);
    const labels = text.indexOf("True answer");
    const judged = text.indexOf("What the model judged");
    expect(labels).toBeGreaterThan(-1);
    expect(judged).toBeGreaterThan(labels);
    expect(text.indexOf("Use reference answer")).toBeLessThan(judged);
    act(() => drillRoot.unmount());
    drill.remove();
  });

  it("draws phone cards with the question, both answers and the agree mark, and opens the drill", async () => {
    const table = tables["agents/decision-review/reference-results"]!;
    expect(table.mobileCardsBreakpoint).toBe("sm");
    const open = jest.fn();
    const controls = {
      renderCell: (id: string) => <span data-cell={id} />,
      selected: false,
      selectable: false,
      onSelectedChange: () => {},
      actions: null,
      expandedDetail: null,
      open,
    } as MatrxDataTableMobileCardControls;
    const card = document.createElement("div");
    document.body.append(card);
    const cardRoot = createRoot(card);
    await act(async () => {
      cardRoot.render(<>{table.mobileCards?.(table.data![0]!, 0, controls)}</>);
    });
    const text = card.textContent ?? "";
    expect(text).toContain(table.data![0]!.item.question);
    expect(text).toContain("No 96%");
    expect(text).toContain("No 97%");
    expect(card.querySelector('[data-cell="agree"]')).not.toBeNull();
    (card.querySelector('[role="button"]') as HTMLElement).click();
    expect(open).toHaveBeenCalled();
    act(() => cardRoot.unmount());
    card.remove();
  });
});
