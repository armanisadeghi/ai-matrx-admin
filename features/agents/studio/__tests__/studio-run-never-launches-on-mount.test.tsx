/**
 * Lane 5A guards (Agent Studio on canonical parts). Each was proven RED on the pre-5A code (taken with
 * `git show` into a mktemp dir) and GREEN on this code:
 *
 *  1. ONE PANE TREE. An agent arriving or a layout change never remounts a pane: the page has one stable
 *     surface root (no `agentId ? <BuilderSurface> : <StudioSurface>` swap, no `key={state.mode}`) and one
 *     resizable group (StudioPanes) whose panels never unmount. Proven on a real DOM: the same four nodes
 *     survive three → two → tabs → three, and the drag handles exist between shown panes (lane 5A-b:
 *     5A had dropped them; RED on 5A's `a4c1…` tree, which has no StudioPanes).
 *  2. AN IDLE PANE MAKES 0 READS. The workspace reads once on open and then follows the row's realtime
 *     UPDATEs; 30 s of idle makes no read (the old 2.5 s poll made 12).
 *  3. NOTHING IS SWALLOWED. No `.catch(() => undefined)`, `.catch(() => [])`, `() => undefined` rejection
 *     handler or empty/comment-only `catch {}` in features/agents/studio/**.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";

const loadWorkspaceRow = jest.fn(async () => ({ version: 1, metadata: {} }));
const loadWorkspace = jest.fn(async () => ({}));
const channels: unknown[] = [];
/** Any direct row read (the pre-5A pane read through the client itself): counted as a read. */
let fromCalls = 0;
jest.mock("@/utils/supabase/client", () => {
  const row = { data: { id: "conv-1", version: 1, metadata: {} }, error: null };
  const chain: Record<string, unknown> = {};
  for (const k of ["schema", "select", "eq", "update"]) chain[k] = () => chain;
  chain.from = () => {
    fromCalls += 1;
    return chain;
  };
  chain.maybeSingle = async () => row;
  return { createClient: () => chain };
});
jest.mock("@ai-matrx/data/realtime/react", () => ({ useChannel: (spec: unknown) => channels.push(spec) }));
jest.mock("@ai-matrx/data/realtime", () => ({ defineChannelNamespace: () => ({ topic: (p: { conversationId: string }) => `t:${p.conversationId}` }) }));
jest.mock("../workspace", () => ({
  ...jest.requireActual("../workspace"),
  loadWorkspace: (...a: unknown[]) => loadWorkspace(...(a as [])),
  loadWorkspaceRow: (...a: unknown[]) => loadWorkspaceRow(...(a as [])),
  editWorkspace: jest.fn(),
}));
jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({ RichContent: () => null }));
jest.mock("@ai-matrx/rich-content/display/chat-markdown/matrx-variables/VariableChip", () => ({ VariableChip: () => null }));
jest.mock("@/components/official/ProTextarea", () => ({ ProTextarea: () => null }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn(), info: jest.fn(), success: jest.fn() } }));

const STUDIO = join(__dirname, "..");
const PAGE = process.env.STUDIO_PAGE_UNDER_TEST ?? join(STUDIO, "components", "AgentStudioPage.tsx");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("guard 1: one pane tree survives an agent arriving and a layout change", () => {
  const page = strip(readFileSync(PAGE, "utf8"));

  it("has ONE surface root whose props change, never a root swap or a mode key", () => {
    expect(page).not.toMatch(/\?\s*<BuilderSurface/);
    expect(page).not.toMatch(/key=\{state\.mode\}/);
    expect(page.match(/<StudioSurfaceRoot\b/g) ?? []).toHaveLength(1);
    expect(page.match(/<StudioPanes\b/g) ?? []).toHaveLength(1);
  });

  // The real pane tree (react-resizable-panels v4 group) across every layout and an agent arriving.
  function renderPanes() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { StudioPanes } = require(process.env.STUDIO_PANES_UNDER_TEST ?? "../components/StudioPanes") as typeof import("../components/StudioPanes");
    type L = "three" | "two" | "tabs";
    const Tree = ({ layout, agentId }: { layout: L; agentId: string | null }) => (
      <StudioPanes
        layout={layout}
        ui={{ side: "assistant", tab: "agent" }}
        saved={{}}
        switchBar={<span>switch</span>}
        panes={{ assistant: <span>a{agentId}</span>, agent: <span>b{agentId}</span>, controls: <span>c{agentId}</span> }}
      />
    );
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    return { host, render: (layout: L, agentId: string | null) => act(() => root.render(<Tree layout={layout} agentId={agentId} />)) };
  }

  it("the same four DOM nodes survive three → two → tabs → three and an agent arriving", () => {
    const panes = ["switch", "assistant", "agent", "controls"] as const;
    const { host, render } = renderPanes();
    render("three", null);
    const before = panes.map((p) => host.querySelector(`[data-studio-pane="${p}"]`));
    before.forEach((n) => expect(n).not.toBeNull());
    for (const [layout, agentId] of [["two", null], ["tabs", "a1"], ["three", "a1"]] as const) {
      render(layout, agentId);
      panes.forEach((p, i) => expect(host.querySelector(`[data-studio-pane="${p}"]`)).toBe(before[i]));
    }
  });

  it("the panes are resizable: a drag handle between each pair of shown panes, none beside a hidden one", () => {
    const { host, render } = renderPanes();
    const handles = () => [...host.querySelectorAll('[role="separator"]')].map((n) => n.id);
    render("three", null);
    expect(handles()).toEqual(["studio-resize-assistant-agent", "studio-resize-agent-controls"]);
    render("two", null);
    expect(handles()).toEqual(["studio-resize-assistant-agent"]);
    render("tabs", null);
    expect(handles()).toEqual([]);
  });
});

describe("guard 2: an idle workspace pane makes 0 reads in 30 s", () => {
  it("reads once on open, then only on a realtime UPDATE", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useStudioWorkspace } = require(process.env.STUDIO_PANE_UNDER_TEST ?? "../components/StudioWorkspacePane") as typeof import("../components/StudioWorkspacePane");
    jest.useFakeTimers();
    function Probe() {
      useStudioWorkspace("conv-1");
      return null;
    }
    const root = createRoot(document.createElement("div"));
    await act(async () => root.render(<Probe />));
    const reads = () => loadWorkspaceRow.mock.calls.length + loadWorkspace.mock.calls.length + fromCalls;
    const opened = reads();
    expect(opened).toBe(1);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(reads() - opened).toBe(0);
    jest.useRealTimers();
  }, 120_000);
});

describe("guard 3: nothing is swallowed in features/agents/studio/**", () => {
  /** Files another lane owns and is fixing (BUILD-PLAN §A): remove each as that lane lands. Shrink-only. */
  const OTHER_LANE_PENDING = new Set<string>([]);
  const SWALLOW = [
    /\.catch\(\s*\(\s*\)\s*=>\s*(undefined|null|\[\]|\{\s*\})\s*\)/,
    /,\s*\(\s*\)\s*=>\s*undefined\s*,?\s*\)/,
    /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*\}/,
    /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*(\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*\}\s*\)/,
    // A bare `catch { return null | [] | undefined }`: the failure becomes "nothing there" with no
    // message (review F-5A-2, 2026-10-21). A catch that binds the error and says it is not matched.
    /catch\s*\{\s*(\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*return\s*(null|undefined|\[\s*\]|\{\s*\}|false)?\s*;?\s*\}/,
  ];
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== "__tests__") walk(p);
      } else if (/\.(ts|tsx)$/.test(name)) files.push(p);
    }
  };
  walk(process.env.STUDIO_DIR_UNDER_TEST ?? STUDIO);

  it("every failure is said (ErrorNotice, toast or a logged reason)", () => {
    const hits = files
      .filter((f) => !OTHER_LANE_PENDING.has(relative(process.env.STUDIO_DIR_UNDER_TEST ?? STUDIO, f)))
      .flatMap((f) => {
        const src = readFileSync(f, "utf8");
        return SWALLOW.filter((re) => re.test(src)).map((re) => `${relative(STUDIO, f)} ${re}`);
      });
    expect(hits).toEqual([]);
  });
});

describe("guard 4: the page top is the shell header template, never a hand-built bar in the body (lane 5A-b)", () => {
  const page = strip(readFileSync(PAGE, "utf8"));
  it("renders RecordPageHeader with the stage steps, and no body header row", () => {
    expect(page.match(/<RecordPageHeader\b/g) ?? []).toHaveLength(1);
    expect(page).toMatch(/steps=\{\{\s*steps: stage\.steps/);
    expect(page).not.toMatch(/data-testid="studio-header"/);
    expect(page).not.toMatch(/<StageSteps\b/);
  });
});

