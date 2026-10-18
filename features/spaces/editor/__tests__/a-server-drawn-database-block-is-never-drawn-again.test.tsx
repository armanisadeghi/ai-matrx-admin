/**
 * @jest-environment jsdom
 */
// A SERVER-DRAWN DATABASE BLOCK IS NEVER DRAWN AGAIN BY THE BROWSER (lane SPACES-REDRAW, 2026-10-17).
//
// A Spaces page's first paint carries each database block with its rows, drawn on the server. The browser
// used to hydrate those blocks, could not do it at once (their code and seed arrive later), and React threw
// their HTML away the moment anything above them changed — every database block collapsed to its loading
// box and grew back about two seconds after load (CLS 0.5 at 1600 px). The browser now keeps the served
// element exactly as it is until the editor takes the page over. These tests hydrate a served block, re-render
// it with new props objects and a changing context above it, and check that the served rows are the very same
// elements throughout, with no hydration error.

import { act, createContext, useState, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";

import { ServerDrawnDatabase } from "../server-drawn-database";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("../../data/DatabaseBlock", () => ({
  DatabaseBlock: () => <div className="spaces-db-frame">drawn again in the browser</div>,
}));

const Outer = createContext(0);
let bump: () => void = () => undefined;
function Above({ children }: { children: ReactNode }) {
  const [n, setN] = useState(0);
  bump = () => setN((x) => x + 1);
  return <Outer value={n}>{children}</Outer>;
}

const props = () => ({ views: [{ id: "v1", layout: "board" }], activeViewId: "v1", source: { kind: "table", tableId: "t1" } });

// What the server sends for the block: the host element with its rows (and a streamed boundary's markers).
const SERVED =
  '<div class="spaces-db-host" contenteditable="false" data-layout="board" data-block-id="b1"><!--$--><div class="spaces-db-frame" data-layout="board"><div class="row">Corinna Valdez</div><div class="row">Anders Holm</div></div><!--/$--></div>';

it("keeps the served rows as the very same elements through hydration and later renders", async () => {
  const host = document.createElement("div");
  host.innerHTML = SERVED;
  document.body.appendChild(host);
  const frame = host.querySelector(".spaces-db-frame");
  const rows = [...host.querySelectorAll(".row")];
  expect(rows).toHaveLength(2);

  const errors: string[] = [];
  const spy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => void errors.push(args.map(String).join(" ")));
  let root!: ReturnType<typeof hydrateRoot>;
  await act(async () => {
    root = hydrateRoot(
      host,
      <Above>
        <ServerDrawnDatabase blockId="b1" p={props()} />
      </Above>,
      { onRecoverableError: (e) => errors.push(`recoverable: ${String(e)}`) },
    );
  });
  // A context above changes and the block is rendered again with new props objects (the page re-rendering).
  await act(async () => bump());
  await act(async () => root.render(<Above><ServerDrawnDatabase blockId="b1" p={props()} /></Above>));

  expect(host.querySelector(".spaces-db-frame")).toBe(frame);
  expect([...host.querySelectorAll(".row")]).toEqual(rows);
  expect(host.textContent).not.toContain("drawn again in the browser");
  expect(host.querySelector(".spaces-db-loading")).toBeNull();
  await act(async () => root.unmount());
  host.remove();
  spy.mockRestore();
  expect(errors).toEqual([]);
});
