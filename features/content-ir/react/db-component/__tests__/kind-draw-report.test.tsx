/**
 * B0 (2026-10-15): the Preview verdict claimed "rendered" from the route's
 * answer. The drawing mounts now report what they drew; this proves the host
 * combines those reports honestly — never "drew" while anything waits or
 * failed, and never "drew" before the first commit has let reporters speak.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  KindDrawReportHost,
  ReportKindDraw,
  combineDrawStates,
  useKindDrawCollector,
  type KindDrawState,
} from "../kind-draw-report";

let root: Root;
let container: HTMLDivElement;
const seen: KindDrawState[] = [];

function Host({ children }: { children: React.ReactNode }) {
  const draw = useKindDrawCollector();
  seen.push(draw.state);
  return (
    <>
      <span data-testid="state">{draw.state}</span>
      <KindDrawReportHost report={draw.report}>{children}</KindDrawReportHost>
    </>
  );
}

const state = () => container.querySelector("[data-testid=state]")?.textContent;

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  seen.length = 0;
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("combineDrawStates", () => {
  it("any failure fails; all drew draws; else waiting; nobody = none", () => {
    expect(combineDrawStates([])).toBe("none");
    expect(combineDrawStates(["drew", "failed"])).toBe("failed");
    expect(combineDrawStates(["drew", "waiting"])).toBe("waiting");
    expect(combineDrawStates(["drew", "drew"])).toBe("drew");
  });
});

describe("useKindDrawCollector", () => {
  it("a waiting frame keeps the host waiting — never a first-paint 'drew'", () => {
    act(() => root.render(<Host><ReportKindDraw state="waiting" /></Host>));
    expect(state()).toBe("waiting");
    expect(seen).not.toContain("drew");
  });

  it("a frame that failed reports failed, and a later draw clears it", () => {
    act(() => root.render(<Host><ReportKindDraw state="failed" /></Host>));
    expect(state()).toBe("failed");
    act(() => root.render(<Host><ReportKindDraw state="drew" /></Host>));
    expect(state()).toBe("drew");
  });

  it("an unmounted reporter withdraws its report", () => {
    act(() =>
      root.render(
        <Host>
          <ReportKindDraw state="drew" />
          <ReportKindDraw state="waiting" />
        </Host>,
      ),
    );
    expect(state()).toBe("waiting");
    act(() => root.render(<Host><ReportKindDraw state="drew" /></Host>));
    expect(state()).toBe("drew");
  });

  it("with no reporter at all (an in-page built-in), 'drew' only after the commit", () => {
    act(() => root.render(<Host><p>built-in</p></Host>));
    expect(seen[0]).toBe("waiting");
    expect(state()).toBe("drew");
  });
});
