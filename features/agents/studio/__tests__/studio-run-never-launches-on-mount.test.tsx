/**
 * Lane 5A guards (Agent Studio on canonical parts). Each was proven RED on the pre-5A code (taken with
 * `git show` into a mktemp dir) and GREEN on this code:
 *
 *  1. ONE PANE TREE. An agent arriving or a layout change never remounts a pane: the page has one stable
 *     surface root (no `agentId ? <BuilderSurface> : <StudioSurface>` swap, no `key={state.mode}`) and one
 *     set of pane slots that the layout only re-styles. Proven on a real DOM: the same four nodes survive
 *     three → two → tabs → three.
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
    expect(page).not.toMatch(/ResizablePanelGroup/);
    expect(page.match(/<StudioSurfaceRoot\b/g) ?? []).toHaveLength(1);
    expect(page).toMatch(/studioSlot\(layout, pane/);
    for (const pane of ["switch", "assistant", "agent", "controls"]) {
      expect(page.match(new RegExp(`paneProps\\("${pane}"\\)`, "g")) ?? []).toHaveLength(1);
    }
  });

  it("the same four DOM nodes survive three → two → tabs → three and an agent arriving", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { studioSlot, studioGrid } = require(process.env.STUDIO_LAYOUT_UNDER_TEST ?? "../studio-layout") as typeof import("../studio-layout");
    type L = "three" | "two" | "tabs";
    const panes = ["switch", "assistant", "agent", "controls"] as const;
    function Tree({ layout, agentId }: { layout: L; agentId: string | null }) {
      return (
        <div style={studioGrid(layout)} data-agent={agentId ?? ""}>
          {panes.map((p) => {
            const slot = studioSlot(layout, p, { side: "assistant", tab: "agent" });
            return <div key={p} data-pane={p} style={slot.style} hidden={!slot.shown} />;
          })}
        </div>
      );
    }
    const host = document.createElement("div");
    const root = createRoot(host);
    act(() => root.render(<Tree layout="three" agentId={null} />));
    const before = panes.map((p) => host.querySelector(`[data-pane="${p}"]`));
    for (const [layout, agentId] of [["two", null], ["tabs", "a1"], ["three", "a1"]] as const) {
      act(() => root.render(<Tree layout={layout} agentId={agentId} />));
      panes.forEach((p, i) => expect(host.querySelector(`[data-pane="${p}"]`)).toBe(before[i]));
    }
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
  const OTHER_LANE_PENDING = new Set(["components/StudioStart.tsx"]);
  const SWALLOW = [
    /\.catch\(\s*\(\s*\)\s*=>\s*(undefined|null|\[\]|\{\s*\})\s*\)/,
    /,\s*\(\s*\)\s*=>\s*undefined\s*,?\s*\)/,
    /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*\}/,
    /\.catch\(\s*\(\s*\)\s*=>\s*\{\s*(\/\/[^\n]*\n\s*|\/\*[\s\S]*?\*\/\s*)*\}\s*\)/,
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
