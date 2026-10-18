/**
 * RENDER LIKE THE BROWSER, NOT LIKE THE SERVER, for suites that assert what a reader SEES.
 *
 * `renderToStaticMarkup` is the server render. On the server `useRichContentHostLanded()` is always
 * false (its server snapshot is `notYet`), and since frontend 2218dbc83bf `AnswerValueView` answers
 * "false" with a waiting skeleton (`data-answer-waiting-for-host`) instead of drawing a kind before
 * the lazily loaded rich-content host has registered the kind registry's database tiers. That is the
 * intended behaviour (a nested kind must never settle on the floor view for good), but it means a
 * static render of a payload with nested children can only ever show the skeleton.
 *
 * The browser render has the host landed (Jest has no lazy loader: `richContentHostReady()` is true),
 * so the nested children draw. This helper mounts on a real client root inside `act` and returns the
 * markup the reader would see after the first client paint.
 */
import type { ReactElement } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

export function renderLanded(element: ReactElement): string {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let html = "";
  try {
    act(() => {
      root.render(element);
    });
    html = container.innerHTML;
    if (html.includes("data-answer-waiting-for-host")) {
      throw new Error("renderLanded: the host never landed — a waiting skeleton is still on screen");
    }
  } finally {
    act(() => root.unmount());
    container.remove();
  }
  return html;
}
