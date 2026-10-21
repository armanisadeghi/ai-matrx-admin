/**
 * /shape-preview is the page aidream's shape inspection measures (services/kind_preview/inspection.py):
 * the signed `t` token is the only credential, a bad token is VISIBLE text plus a finished `error` report
 * (so the browser never waits out its deadline), and a good bundle mounts the `[data-shape-preview]` root
 * the measure script is pointed at. Raw react-dom (no @testing-library in this repo).
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

let search = "";
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/lib/python-client", () => ({ resolveBaseUrl: () => "https://server.test" }));
jest.mock("@/features/content-ir/react/db-component/DbKindComponent", () => ({
  DbKindComponent: ({ content }: { content: string }) => <div data-testid="shape-body">{content}</div>,
}));

import ShapePreviewClient from "../ShapePreviewClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const BUNDLE = {
  kind: "market_quote",
  data: { __kind: "market_quote", symbol: "NFLX", price: 70.53 },
  data_source: "example:e-1",
  component: {
    component_id: "c-1",
    component_key: "market_quote",
    source: "db",
    component_source: "export default function Q(){return null}",
    props_transform: null,
    config: {},
    pinned_kind_version: null,
    is_active: true,
    updated_at: null,
    created_by: null,
  },
};

let container: HTMLDivElement;
let root: Root;

function respond(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body }) as unknown as typeof fetch;
}

async function mount() {
  await act(async () => {
    root.render(<ShapePreviewClient />);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  delete window.__MATRX_SHAPE_PREVIEW__;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("/shape-preview", () => {
  it("shows a bad token as visible text and publishes a finished error report", async () => {
    search = "t=forged.sig&theme=light";
    respond(401, { detail: "preview token signature does not match" });
    await mount();
    expect(container.textContent).toContain("preview token signature does not match");
    expect(window.__MATRX_SHAPE_PREVIEW__).toMatchObject({ done: true, stage: "error" });
    expect(window.__MATRX_SHAPE_PREVIEW__?.error).toContain("could not load");
  });

  it("says so when there is no token, without calling the server", async () => {
    search = "theme=dark";
    global.fetch = jest.fn() as unknown as typeof fetch;
    await mount();
    expect(container.textContent).toContain("No preview token.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("loads the bundle by token alone and mounts the root the measure script targets", async () => {
    search = "t=abc.def&theme=dark";
    respond(200, BUNDLE);
    await mount();
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe("https://server.test/public/kind-components/preview/abc.def");
    expect(init).toBeUndefined(); // no Authorization header: the token is the whole credential
    const rootEl = container.querySelector('[data-shape-preview="market_quote"]');
    expect(rootEl).not.toBeNull();
    expect(rootEl?.textContent).toContain("NFLX");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
