/**
 * "New board" made the board but the person stayed on the list (live 2026-10-19/20). Cause: the
 * `/board/<id>` route had no loading boundary, so `router.push` did not commit the URL until the
 * server had rendered the page; a cold or slow server (measured: URL changed exactly when a 5 s
 * server delay ended) looked like the board never opened. The route must commit at once.
 */
import fs from "fs";
import path from "path";
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ROUTE = path.join(process.cwd(), "app/(core)/board/[id]");

describe("/board/<id> commits before the server answers", () => {
  it("has a loading boundary next to its server-rendered page", () => {
    expect(fs.existsSync(path.join(ROUTE, "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(ROUTE, "loading.tsx"))).toBe(true);
  });

  it("the boundary renders placeholders on its own (no data, no providers)", async () => {
    const mod = await import("@/app/(core)/board/[id]/loading");
    const host = document.createElement("div");
    const root = createRoot(host);
    await act(async () => root.render(<mod.default />));
    expect(host.querySelector('[aria-label="Opening your board"]')).not.toBeNull();
    await act(async () => root.unmount());
  });
});
