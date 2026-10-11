/**
 * A shape that imports an on-demand library (date-fns, lodash, xlsx, motion…)
 * with the forms the shape rulebook promises gets it in BOTH render paths,
 * when the row declares no `allowed_imports` (the default component entries,
 * which leave every on-demand library out):
 *  - in page: `useOnDemandScopeReady` holds the compile until the libraries
 *    land, then the synchronous kind compiler binds them;
 *  - in the sandbox frame: `prepareFrameLazyModules` + `executeKindBody`.
 * The fake modules stand in for the real loaders (page `import()` / frame
 * chunk scripts), which jsdom cannot fetch; the binding path is the real one.
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { kindComponentCompiler } from "@ai-matrx/code-runtime";
import { defaultComponentEntries, provideScopeModules } from "@ai-matrx/code-runtime/scope";
import { provideAppScopeModules } from "../app-scope";
import { useOnDemandScopeReady } from "../useOnDemandScope";
import { transformKindComponentBody } from "@/features/content-ir/sandbox/transform/transform-kind-body";
import { executeKindBody } from "@/features/content-ir/sandbox/runtime/execute-kind-body";
import {
  prepareFrameLazyModules,
  provideFrameLazyModules,
} from "@/features/content-ir/sandbox/runtime/frame-lazy-modules";

const SHAPE = `import { format, parseISO } from "date-fns";
import { sumBy } from "lodash";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "motion/react";
export default function SignupMetrics() {
  return <AnimatePresence><motion.div>{format(parseISO("2026-10-10"))} {sumBy([{ n: 2 }, { n: 3 }], "n")} {XLSX.utils.book_new()}</motion.div></AnimatePresence>;
}`;

function provideFakes(): void {
  const lodash = Object.assign(() => undefined, {
    sumBy: (rows: Array<Record<string, number>>, key: string) => rows.reduce((t, r) => t + (r[key] ?? 0), 0),
  });
  provideScopeModules({
    "date-fns": async () => ({ parseISO: (s: string) => `iso:${s}`, format: (v: string) => `fmt:${v}` }),
    lodash: async () => ({ __esModule: true, default: lodash }),
    xlsx: async () => ({ utils: { book_new: () => "book" } }),
    "motion/react": async () => ({
      motion: { div: (p: { children?: React.ReactNode }) => <div>{p.children}</div> },
      AnimatePresence: (p: { children?: React.ReactNode }) => <>{p.children}</>,
    }),
  });
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Render into a fresh container; returns its text after React settles. */
async function renderText(node: React.ReactNode): Promise<{ text: () => string; unmount: () => void }> {
  const container = document.body.appendChild(document.createElement("div"));
  const root = createRoot(container);
  await act(async () => root.render(node));
  return {
    text: () => container.textContent ?? "",
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function ReadyProbe({ code }: { code: string }) {
  return <span>{useOnDemandScopeReady(code) ? "ready" : "loading"}</span>;
}

describe("on-demand libraries reach a shape on both render paths", () => {
  it("in page: the hook waits for the imported libraries, then the default-entries compile binds them", async () => {
    provideAppScopeModules();
    provideFakes();
    const probe = await renderText(<ReadyProbe code={SHAPE} />);
    // act() flushed the loads the first render started; before them it read "loading".
    for (let i = 0; i < 20 && probe.text() !== "ready"; i += 1) await act(async () => undefined);
    expect(probe.text()).toBe("ready");
    probe.unmount();

    const compiled = kindComponentCompiler()({ code: SHAPE, allowedImports: defaultComponentEntries() });
    expect(compiled.error).toBeNull();
    const Shape = compiled.Component!;
    const view = await renderText(<Shape />);
    expect(view.text()).toBe("fmt:iso:2026-10-10 5 book");
    view.unmount();
  });

  it("in the frame: the payload's default entries omit the libraries, the frame preloads and binds them", async () => {
    provideFrameLazyModules();
    provideFakes();
    const { payload, error } = transformKindComponentBody(SHAPE, defaultComponentEntries());
    expect(error).toBeNull();
    await act(async () => {
      expect((await prepareFrameLazyModules(payload)).sort()).toEqual(["date-fns", "lodash", "motion/react", "xlsx"]);
    });
    const result = executeKindBody(payload!);
    expect(result.error).toBeNull();
    expect(result.unresolvedImports).toEqual([]);
    const Shape = result.Component!;
    const view = await renderText(<Shape />);
    expect(view.text()).toBe("fmt:iso:2026-10-10 5 book");
    view.unmount();
  });
});
