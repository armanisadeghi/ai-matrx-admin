jest.mock("@ai-matrx/kit/clipboard-fallback-opener", () => ({ openClipboardFallback: jest.fn(() => Promise.resolve()) }));
import { openClipboardFallback } from "@ai-matrx/kit/clipboard-fallback-opener";
import { copyReferenceFence } from "@/features/matrx-envelope/referenceClipboard";

describe("copyReferenceFence", () => {
  const originalClipboard = navigator.clipboard;

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    });
    jest.restoreAllMocks();
  });

  it("opens the manual-copy path with the exact fence when clipboard access is blocked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error("blocked")) },
    });
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const fence = '```matrx\n{"__kind":"directive_v1_reference_agent"}\n```';
    await expect(copyReferenceFence(fence)).resolves.toBe(false);
    expect(openClipboardFallback).toHaveBeenCalledWith(fence, {});
  });
});
