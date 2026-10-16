import {
  classifyRecordUpdateStatus,
  preferAggregateClean,
  shouldRefreshOnProcessingProgress,
} from "../cleanOutcome";

describe("classifyRecordUpdateStatus", () => {
  it("never reads a failed or queued record_update as success", () => {
    expect(classifyRecordUpdateStatus("failed")).toBe("failed");
    expect(classifyRecordUpdateStatus("awaiting_batch")).toBe("queued");
    expect(classifyRecordUpdateStatus("completed")).toBe("done");
    expect(classifyRecordUpdateStatus(undefined)).toBe("done");
    expect(classifyRecordUpdateStatus("active")).toBe("active");
    // The server's wire shape for a batch-parked clean (aidream pdf_pipeline).
    expect(
      classifyRecordUpdateStatus("active", { run_status: "awaiting_batch" }),
    ).toBe("queued");
    expect(classifyRecordUpdateStatus("completed", {})).toBe("done");
  });
});

describe("shouldRefreshOnProcessingProgress", () => {
  it("refreshes when the clean stage is done, always", () => {
    expect(
      shouldRefreshOnProcessingProgress({ stage: "clean", phase: "done" }, 1000, 1001),
    ).toBe(true);
  });
  it("throttles per-page clean refreshes", () => {
    const evt = { stage: "clean", phase: "page" };
    expect(shouldRefreshOnProcessingProgress(evt, 1000, 2000, 4000)).toBe(false);
    expect(shouldRefreshOnProcessingProgress(evt, 1000, 5000, 4000)).toBe(true);
  });
  it("ignores other stages and phases", () => {
    expect(shouldRefreshOnProcessingProgress({ stage: "embed", phase: "done" }, 0, 99999)).toBe(false);
    expect(shouldRefreshOnProcessingProgress({ stage: "clean", phase: "start" }, 0, 99999)).toBe(false);
  });
});

describe("preferAggregateClean", () => {
  it("prefers the doc text when every page is empty", () => {
    expect(preferAggregateClean(["", " "], "text")).toBe(true);
  });
  it("prefers it when it is clearly fuller than the filled pages", () => {
    expect(preferAggregateClean(["short", ""], "a much longer aggregate clean text")).toBe(true);
  });
  it("keeps per-page view when blank pages are genuinely blank", () => {
    expect(preferAggregateClean(["page one text", ""], "page one text")).toBe(false);
    expect(preferAggregateClean(["a", "b"], "ab")).toBe(false);
  });
});

import { describeRunError, isDocCleaned, USAGE_LIMIT_MESSAGE } from "../cleanOutcome";

describe("describeRunError", () => {
  it("never leaves a trailing colon or a bare machine code", () => {
    expect(describeRunError({ message: "pdfclean_error: Content cleaner agent failed:" })).toBe(
      "Content cleaner agent failed",
    );
    expect(describeRunError({ message: "pdfclean_error:" })).toBeNull();
    expect(describeRunError(null)).toBeNull();
  });
  it("reads a usage limit as one fixed sentence", () => {
    expect(
      describeRunError({ message: "pdfclean_error: Content cleaner agent failed:", detail: "Usage limit reached for plan" }),
    ).toBe(USAGE_LIMIT_MESSAGE);
    expect(describeRunError({ user_message: "You've reached your AI usage limit" })).toBe(USAGE_LIMIT_MESSAGE);
  });
});

describe("isDocCleaned (server clean verdict)", () => {
  const page = (cleanedText: string, sectionKind: string | null = null) => ({ cleanedText, sectionKind });
  it("partially cleaned pages are not cleaned", () => {
    expect(isDocCleaned([page(""), page("x")], null)).toBe(false);
  });
  it("every page cleaned, including illegible_scan cleaned to empty, is cleaned", () => {
    expect(isDocCleaned([page("x"), page("", "illegible_scan")], null)).toBe(true);
    expect(isDocCleaned([page("", "body")], null)).toBe(true);
  });
  it("whole_document marker + clean_content is cleaned", () => {
    expect(isDocCleaned([page(""), page("")], "text", "whole_document")).toBe(true);
    expect(isDocCleaned([page("")], "", "whole_document")).toBe(false);
  });
  it("clean_content without the marker beside unmarked pages is not cleaned", () => {
    expect(isDocCleaned([page(""), page("")], "raw copy")).toBe(false);
    expect(isDocCleaned([page("")], "raw copy", "pages")).toBe(false);
  });
  it("no pages: cleaned iff clean_content is non-empty", () => {
    expect(isDocCleaned([], "text")).toBe(true);
    expect(isDocCleaned([], "  ")).toBe(false);
    expect(isDocCleaned([], null)).toBe(false);
  });
});
