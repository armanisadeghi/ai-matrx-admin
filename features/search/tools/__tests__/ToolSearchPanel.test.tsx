/**
 * The search page's catalog tabs (L12d): a lane runs the first LIVE Tool of its job; with none live it
 * says so in one line; a pasted store link picks its lane; a name where a link is wanted looks for it
 * (free) instead of buying a failed call; the price shows before the press.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type FormState = { data?: unknown; isLoading: boolean };
const forms: Record<string, FormState> = {};
const formFor = (toolId: string, state: string, price: number | null = null, input = "url") => ({
  schema: {
    inputs: [{ name: input, label: "Link", kind: "text", primary: true, required: true, default: "", options: [], sourcing: "require" }],
    hints: {},
  },
  facts: { toolId, displayName: toolId, summary: "", displayNoun: "Report", submitLabel: "Get reviews", priceHintPoints: price, state, offNotice: null },
});

const callRun = jest.fn();
const finderFind = jest.fn();
let finderState: { phase: string } = { phase: "idle" };
let params = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => params,
  usePathname: () => "/search",
}));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({ replaceAddressWithoutNavigating: jest.fn() }));
jest.mock("@/features/data-sources/library/tools/useToolRunForm", () => ({
  useToolRunForm: (key: string | null) => (key ? (forms[key] ?? { data: undefined, isLoading: false }) : { data: undefined, isLoading: false }),
}));
jest.mock("@/features/data-sources/library/tools/useToolCall", () => ({
  useToolCall: (toolId: string) => ({ view: null, clientError: null, run: (...a: unknown[]) => callRun(toolId, ...a), resume: jest.fn(), reopen: jest.fn(), stop: jest.fn(), clear: jest.fn(), setView: jest.fn() }),
}));
jest.mock("@/features/data-sources/library/tools/ToolResult", () => ({ ToolResult: () => <div data-result="" /> }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => <i data-alchemy="" /> }));
jest.mock("../useLaneFinder", () => ({ useLaneFinder: () => ({ state: finderState, find: finderFind, clear: jest.fn() }) }));
jest.mock("@ai-matrx/chat/action-requests/hooks/useToolAction", () => ({ ToolActionApprovalDialog: () => null }));
jest.mock("@ai-matrx/chat/mandates/invoke/SimpleBoxForm", () => ({
  SimpleBoxForm: (p: {
    inputs: { name: string }[];
    values: Record<string, unknown>;
    onChange: (n: string, v: unknown) => void;
    onSubmit: (o: Record<string, unknown>) => void;
    footer?: React.ReactNode;
  }) => (
    <div>
      <input data-box="" value={String(p.values[p.inputs[0]?.name ?? "url"] ?? "")} onChange={(e) => p.onChange(p.inputs[0]?.name ?? "url", e.target.value)} />
      <button data-go="" onClick={() => p.onSubmit({})} />
      {p.footer}
    </div>
  ),
}));
jest.mock("@ai-matrx/design-system/controls", () => ({
  Button: (p: { children: React.ReactNode; onClick?: () => void }) => <button onClick={p.onClick}>{p.children}</button>,
  Tabs: (p: { data: { value: string; label: string }[]; value: string; onValueChange: (v: string) => void }) => (
    <div data-lanes={p.value}>
      {p.data.map((d) => (
        <button key={d.value} data-lane-chip={d.value} onClick={() => p.onValueChange(d.value)}>
          {d.label}
        </button>
      ))}
    </div>
  ),
}));

import { ToolSearchPanel } from "../ToolSearchPanel";

let root: Root;
let host: HTMLDivElement;
const show = (tab: "reviews" | "deep" | "answers", seed = "") => act(() => root.render(<ToolSearchPanel tab={tab} seed={seed} />));
const type = (value: string) =>
  act(() => {
    const input = host.querySelector("[data-box]") as HTMLInputElement;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
const press = () => act(() => (host.querySelector("[data-go]") as HTMLButtonElement).click());

beforeEach(() => {
  for (const k of Object.keys(forms)) delete forms[k];
  callRun.mockClear();
  finderFind.mockClear();
  finderState = { phase: "idle" };
  params = new URLSearchParams();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("the Reviews tab", () => {
  it("runs the first LIVE Tool of the job, never the draft before it", () => {
    forms.customer_reviews = { isLoading: false, data: formFor("t-trustpilot-task", "draft") };
    forms.data_trustpilot_reviews = { isLoading: false, data: formFor("t-trustpilot-page", "live", 40) };
    show("reviews");
    act(() => (host.querySelector('[data-lane-chip="trustpilot"]') as HTMLButtonElement).click());
    type("https://www.trustpilot.com/review/www.apple.com");
    press();
    expect(callRun).toHaveBeenCalledTimes(1);
    expect(callRun.mock.calls[0]?.[0]).toBe("t-trustpilot-page");
    expect(host.querySelector("[data-tool-price]")?.textContent).toMatch(/40/);
  });

  it("says so in one line when no Tool of the lane is live", () => {
    forms.place_reviews = { isLoading: false, data: undefined };
    show("reviews");
    expect(host.querySelector("[data-tool-unavailable]")?.textContent).toMatch(/Google Maps isn't available right now/);
  });

  it("lets a pasted App Store link pick its own lane", () => {
    forms.place_reviews = { isLoading: false, data: formFor("t-maps", "live") };
    forms.app_store_reviews = { isLoading: false, data: formFor("t-app", "live") };
    show("reviews");
    expect(host.querySelector("[data-tool-lane]")?.getAttribute("data-tool-lane")).toBe("maps");
    type("https://apps.apple.com/us/app/gumroad/id916819108");
    expect(host.querySelector("[data-tool-lane]")?.getAttribute("data-tool-lane")).toBe("appstore");
  });

  it("opens on the source a link named in the search box", () => {
    forms.app_store_reviews = { isLoading: false, data: formFor("t-app", "live", null, "product_id") };
    show("reviews", "https://apps.apple.com/us/app/gumroad/id916819108");
    expect(host.querySelector("[data-tool-lane]")?.getAttribute("data-tool-lane")).toBe("appstore");
  });

  it("looks for a name instead of buying a call that would fail", () => {
    forms.app_store_reviews = { isLoading: false, data: formFor("t-app", "live") };
    show("reviews");
    act(() => (host.querySelector('[data-lane-chip="appstore"]') as HTMLButtonElement).click());
    type("Gumroad");
    press();
    expect(finderFind).toHaveBeenCalledWith("Gumroad");
    expect(callRun).not.toHaveBeenCalled();
  });

  it("sends an App Store link as the app number the Tool wants", () => {
    forms.app_store_reviews = { isLoading: false, data: formFor("t-app", "live", null, "product_id") };
    show("reviews");
    act(() => (host.querySelector('[data-lane-chip="appstore"]') as HTMLButtonElement).click());
    type("https://apps.apple.com/us/app/gumroad/id916819108");
    press();
    expect(callRun).toHaveBeenCalledTimes(1);
    const [toolId, base] = callRun.mock.calls[0] as [string, Record<string, unknown>];
    expect(toolId).toBe("t-app");
    expect(base.product_id).toBe("916819108");
  });
});
