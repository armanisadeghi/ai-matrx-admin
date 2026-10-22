/**
 * THE HOST RACE: a stored kind instance drawn before the lazy rich-content host
 * lands resolves against the compiled floor and settles on the "no custom
 * component yet" view for good. The app's KindInstanceRender binding is the one
 * place every stored-instance render passes, so it waits for the host there.
 * Red on the prior bytes (the shared renderer drew immediately).
 */
import { renderToStaticMarkup } from "react-dom/server";

// One React instance for the whole file: the host's landed state is a switch
// the mock reads live, so no module reset is needed between the two cases.
let hostLanded = false;
jest.mock("@ai-matrx/rich-content/host", () => ({
  requestRichContentHost: () => undefined,
  useRichContentHostLanded: () => hostLanded,
}));
import Render from "../KindInstanceRender";

jest.mock("@ai-matrx/content-ir/react", () => ({
  KindInstanceRender: ({ kind }: { kind: string }) => <div data-kind={kind} />,
  kindIsRoutable: () => true,
  isRecordValue: (v: unknown) => typeof v === "object" && v !== null,
}));
jest.mock("@ai-matrx/rich-content/kinds/registry/kind-correctors", () => ({
  correctKindValue: (_kind: string, value: unknown) => ({ value, corrections: [] }),
}));
jest.mock("@/features/content-ir/react/db-component/KindCorrectionsNotice", () => ({
  KindCorrectionsNotice: () => null,
}));
jest.mock("@/features/content-ir/host/ContentIrHostBoundary", () => ({
  ContentIrHostBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  matrxContentIrHost: {},
}));

const value = { __kind: "electronics_intake_analysis", status: "illegible", products: [] };

describe("KindInstanceRender waits for the lazy rich-content host", () => {
  it("draws a skeleton, never the shared renderer, before the host lands", () => {
    hostLanded = false;
    const html = renderToStaticMarkup(
      <Render kind="electronics_intake_analysis" value={value} />,
    );
    expect(html).toContain("data-kind-instance-waiting-for-host");
    expect(html).not.toContain("data-kind=");
  });

  it("draws the shared renderer once the host has landed", () => {
    hostLanded = true;
    const html = renderToStaticMarkup(
      <Render kind="electronics_intake_analysis" value={value} />,
    );
    expect(html).toContain('data-kind="electronics_intake_analysis"');
    expect(html).not.toContain("data-kind-instance-waiting-for-host");
  });
});
