/**
 * The new agent and the original are compared INSIDE the center pane. Switching what is shown or
 * how it is laid out must never remount the run: a remount starts a fresh, paid run.
 */
import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";

jest.mock("@ai-matrx/rich-content/levels/RichContent", () => ({
  RichContent: ({ source }: { source: string }) => <div data-testid="original-text">{source}</div>,
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: (props: Record<string, unknown>) => (
    <button type="button" data-testid={props["data-testid"] as string} onClick={props.onClick as () => void}>
      {props["aria-label"] as string}
    </button>
  ),
  SegmentedControl: ({ data, onValueChange }: { data: { value: string; label: string }[]; onValueChange: (v: string) => void }) => (
    <div>
      {data.map((d) => (
        <button key={d.value} type="button" data-view={d.value} onClick={() => onValueChange(d.value)}>
          {d.label}
        </button>
      ))}
    </div>
  ),
}));

import { StudioCompare, compareViews } from "../components/StudioCompare";

let mounts = 0;
function FakeRun() {
  useEffect(() => {
    mounts += 1;
  }, []);
  return <div data-testid="run">run</div>;
}

describe("StudioCompare", () => {
  it("switches views and layouts without ever remounting the run", () => {
    mounts = 0;
    const host = document.createElement("div");
    document.body.appendChild(host);
    act(() => {
      createRoot(host).render(<StudioCompare run={<FakeRun />} original="Hi Maria! Reminder: cleaning Wed Oct 14" originalLabel="Approved" />);
    });
    const root = () => host.querySelector('[data-testid="studio-compare"]') as HTMLElement;
    expect(root().dataset.view).toBe("both");
    const click = (sel: string) => act(() => (host.querySelector(sel) as HTMLButtonElement).click());
    click('[data-testid="studio-compare-layout"]');
    expect(root().dataset.layout).toBe("stacked");
    click('[data-view="original"]');
    expect(root().dataset.view).toBe("original");
    click('[data-view="new"]');
    click('[data-view="both"]');
    expect(host.querySelector('[data-testid="original-text"]')?.textContent).toContain("Oct 14");
    expect(mounts).toBe(1);
  });

  it("offers one at a time on a phone", () => {
    expect(compareViews("Your example", true).map((v) => v.value)).toEqual(["new", "original"]);
    expect(compareViews("Approved", false).map((v) => v.value)).toEqual(["both", "new", "original"]);
  });
});
