/**
 * useLiveBrand coalesces a burst of row changes into one refetch. A pending refetch must not outlive the page:
 * unmounting (or switching brand) clears it, so a left page never invalidates queries 750ms later.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const invalidateQueries = jest.fn();
let lastConfig: { postgresChanges: { onChange: () => void }[] } | null = null;

jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries }) }));
jest.mock("@ai-matrx/data/realtime", () => ({ defineChannelNamespace: () => ({ topic: ({ brandId }: { brandId: string }) => `t:${brandId}` }) }));
jest.mock("@ai-matrx/data/realtime/react", () => ({
  useChannel: (cfg: typeof lastConfig) => {
    lastConfig = cfg;
  },
}));
jest.mock("@/features/marketing/data/hooks", () => ({ marketingKeys: { root: ["marketing"] } }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useLiveBrand } = require("../useLiveBrand") as typeof import("../useLiveBrand");

function mount(brandId: string) {
  function Probe({ id }: { id: string }) {
    useLiveBrand(id);
    return null;
  }
  let root: Root;
  act(() => {
    root = createRoot(document.createElement("div"));
    root.render(<Probe id={brandId} />);
  });
  return {
    rerender: (id: string) => act(() => root.render(<Probe id={id} />)),
    unmount: () => act(() => root.unmount()),
  };
}

describe("useLiveBrand", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    invalidateQueries.mockClear();
    lastConfig = null;
  });
  afterEach(() => jest.useRealTimers());

  it("coalesces a burst into one refetch", () => {
    mount("b1");
    lastConfig!.postgresChanges[1].onChange();
    lastConfig!.postgresChanges[2].onChange();
    jest.advanceTimersByTime(1000);
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
  });

  it("clears a pending refetch on unmount", () => {
    const { unmount } = mount("b1");
    lastConfig!.postgresChanges[1].onChange();
    unmount();
    jest.advanceTimersByTime(1000);
    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("clears a pending refetch when the brand changes", () => {
    const { rerender } = mount("b1");
    lastConfig!.postgresChanges[1].onChange();
    rerender("b2");
    jest.advanceTimersByTime(1000);
    expect(invalidateQueries).not.toHaveBeenCalledWith({ queryKey: ["marketing", "brand", "b1"] });
  });
});
