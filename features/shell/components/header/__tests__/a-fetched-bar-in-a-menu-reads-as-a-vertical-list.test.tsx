/**
 * A FETCHED TABLE'S SOURCE BAR INSIDE A HEADER MENU IS A VERTICAL, VIEWPORT-BOUNDED LIST.
 *
 * The use case: a Trustpilot-reviews table made by "Get data" shows Refresh, Get more and View changes
 * in its header. When the header folds them into the "…" menu they once drew as one 1004 px row that
 * started at x=-297, so Refresh sat under the sidebar. jsdom cannot measure layout, so this guards the
 * rule that makes the list vertical: both menus (the "…" popover and the phone sheet) carry it, and it
 * stacks the bar's row (flex-col), drops its spacer and lets its label wrap. The live walk measured it.
 */
import { renderToStaticMarkup } from "react-dom/server";

import { PhoneSheetAction } from "../RouteHeader";

describe("a fetched source bar in a menu", () => {
  it("the phone sheet's row stacks the bar's row and bounds it to the sheet", () => {
    const html = renderToStaticMarkup(
      <PhoneSheetAction
        action={{ key: "fetched", node: <div data-fetched-source-bar="trustpilot"><div className="flex" /></div> } as never}
      />,
    );
    expect(html).toContain("[&amp;_[data-fetched-source-bar]&gt;div:first-child]:flex-col");
    expect(html).toContain("max-w-full");
    expect(html).toContain("[&amp;:has([data-fetched-source-bar])]:w-full");
  });
});
