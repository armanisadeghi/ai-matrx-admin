import { renderToStaticMarkup } from "react-dom/server";

import { StructuredValueView } from "../StructuredValueView";

const mockDebugView = jest.fn<boolean, []>();
jest.mock("@/hooks/useAdminDebugView", () => ({ useAdminDebugView: () => mockDebugView() }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => <span data-report="" /> }));
jest.mock("@ai-matrx/chat/tool-call-visualization/result-fields/ResultValue", () => ({ ResultValue: () => <div>values</div> }));
jest.mock("@ai-matrx/chat/tool-call-visualization/result-fields/ResultJson", () => ({ ResultJson: () => <pre>json</pre> }));

describe("the fallback view hides raw data from everyone but an admin in debug mode", () => {
  it("a member sees one honest line and a report way out, never the raw-data link", () => {
    mockDebugView.mockReturnValue(false);
    const html = renderToStaticMarkup(<StructuredValueView value={{ a: 1 }} kind="some_kind" />);
    expect(html).toContain("We couldn&#x27;t show this result");
    expect(html).toContain("data-report");
    expect(html).not.toContain("raw data");
    expect(html).not.toContain("no custom view yet");
  });

  it("a member on a plain value (no kind) sees no footer at all", () => {
    mockDebugView.mockReturnValue(false);
    const html = renderToStaticMarkup(<StructuredValueView value={{ a: 1 }} />);
    expect(html).not.toContain("raw data");
    expect(html).not.toContain("couldn");
  });

  it("an admin with debug mode on gets the raw-data link", () => {
    mockDebugView.mockReturnValue(true);
    const html = renderToStaticMarkup(<StructuredValueView value={{ a: 1 }} kind="some_kind" />);
    expect(html).toContain("Show the raw data");
    expect(html).not.toContain("We couldn");
  });
});
