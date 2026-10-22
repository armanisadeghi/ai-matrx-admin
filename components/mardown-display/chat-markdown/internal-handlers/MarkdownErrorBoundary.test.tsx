import type { ErrorInfo, ReactNode } from "react";
import { captureRichContentRenderError } from "@ai-matrx/rich-content/host/captureReactError";
import { notifyChunkLoadError } from "@ai-matrx/kit/chunk-load-recovery";
import { MarkdownErrorBoundary } from "@ai-matrx/rich-content/display/chat-markdown/internal-handlers/MarkdownErrorBoundary";

jest.mock("@ai-matrx/rich-content/host/captureReactError", () => ({
  captureRichContentRenderError: jest.fn(),
}));

jest.mock("@ai-matrx/kit/chunk-load-recovery", () => {
  const actual = jest.requireActual(
    "@ai-matrx/kit/chunk-load-recovery",
  ) as object;
  return { ...actual, notifyChunkLoadError: jest.fn() };
});

const errorInfo = { componentStack: "\n    at Lazy" } as ErrorInfo;

function createBoundary(onError?: (error: Error, info: ErrorInfo) => void) {
  return new MarkdownErrorBoundary({
    children: null as ReactNode,
    fallback: null,
    onError,
  });
}

describe("MarkdownErrorBoundary chunk recovery", () => {
  beforeEach(() => jest.clearAllMocks());

  it("routes a nested chunk failure to canonical recovery without recording a render defect", () => {
    const error = new Error("Failed to load chunk /_next/static/chunks/a.js");
    error.name = "ChunkLoadError";

    createBoundary().componentDidCatch(error, errorInfo);

    expect(notifyChunkLoadError).toHaveBeenCalledWith(error);
    expect(captureRichContentRenderError).not.toHaveBeenCalled();
  });

  it("still captures genuine Markdown render failures and invokes the caller hook", () => {
    const onError = jest.fn();
    const error = new Error("renderer failed");

    createBoundary(onError).componentDidCatch(error, errorInfo);

    expect(captureRichContentRenderError).toHaveBeenCalledWith(error, {
      boundary: "MarkdownErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
    expect(notifyChunkLoadError).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error, errorInfo);
  });
});
