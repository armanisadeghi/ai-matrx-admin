/**
 * A LIST CARD'S RIGHT-CLICK OPENS THE SAME FILE MENU AS ITS ⋯ BUTTON.
 *
 * Table rows had a right-click menu; cards on the Workbooks and Documents homes
 * had none (the browser's own menu appeared). `FileCardContextArea` opens the
 * card's file menu (the one `menuFor` renders) from a right-click; Shift keeps
 * the browser's menu.
 *
 * Breaks that turn this red: the area not opening the menu, swallowing the
 * Shift escape, or a home rendering its cards without the area.
 */
import fs from "node:fs";
import path from "node:path";
import React, { act } from "react";
import { createRoot } from "react-dom/client";

import { FileCardContextArea } from "../FileCardContextArea";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("right-click opens the card's menu; Shift+right-click leaves the browser's", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <FileCardContextArea menu={({ open }) => <span data-testid="menu">{open ? "open" : "closed"}</span>}>
        {(menu) => <div data-testid="card">Q3 hiring plan {menu}</div>}
      </FileCardContextArea>,
    );
  });
  const area = host.querySelector("[data-file-card-context]")!;
  const state = () => host.querySelector("[data-testid=menu]")!.textContent;
  expect(state()).toBe("closed");

  const shifted = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, shiftKey: true });
  act(() => {
    area.querySelector("[data-testid=card]")!.dispatchEvent(shifted);
  });
  expect(shifted.defaultPrevented).toBe(false);
  expect(state()).toBe("closed");

  const plain = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
  act(() => {
    area.querySelector("[data-testid=card]")!.dispatchEvent(plain);
  });
  expect(plain.defaultPrevented).toBe(true);
  expect(state()).toBe("open");
  act(() => root.unmount());
});

it("both homes render their cards inside the area, with the card's own menu", () => {
  const root = path.resolve(__dirname, "../../..");
  // Both homes are the shared FileHome; its grid cards and phone rows sit inside the area.
  for (const page of ["app/(core)/workbooks/page.tsx", "app/(core)/documents/page.tsx"]) {
    const src = fs.readFileSync(path.join(root, page), "utf8");
    expect(src).toMatch(/<FileHome</);
  }
  const home = fs.readFileSync(path.join(root, "features/file-actions/home/FileHome.tsx"), "utf8");
  expect(home).toMatch(/<FileCardContextArea[\s\S]*?menu=\{\(control\) => menuFor\(d\.item\.row, trashed, control[,)]/);
  expect(home).toMatch(/<FileCardContextArea[\s\S]*?menu=\{\(control\) => menuFor\(d\.item\.row, control\)\}/);
});
