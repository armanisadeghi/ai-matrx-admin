/**
 * AI TEST MODE header (lib/api/ai-test-mode.ts; common-docs/policies/ai-test-mode.md):
 * the tab's mode → `X-Matrx-AI-Test-Mode`; `real` sends NO header; a
 * `?ai_test_mode=` URL param sets the tab's storage and is stripped; the
 * org-context seam every aidream transport binds through carries it.
 */
import {
  AI_TEST_MODE_HEADER,
  AI_TEST_MODE_STORAGE_KEY,
  aiTestModeFromSearch,
  aiTestModeHeaders,
  aiTestModeHeadersFor,
  captureAiTestModeFromUrl,
  readAiTestMode,
  setAiTestMode,
  withAiTestModeHeader,
} from "@/lib/api/ai-test-mode";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";

const ORG = "5dc930e9-bd65-44a1-8369-af773f6e1a5b";

function goTo(path: string) {
  window.history.replaceState(null, "", path);
}

beforeEach(() => {
  window.sessionStorage.clear();
  goTo("/");
});

describe("mode → header", () => {
  it("replay and stand_in send the header; real sends none", () => {
    expect(aiTestModeHeadersFor("replay")).toEqual({ [AI_TEST_MODE_HEADER]: "replay" });
    expect(aiTestModeHeadersFor("stand_in")).toEqual({ [AI_TEST_MODE_HEADER]: "stand_in" });
    expect(aiTestModeHeadersFor("real")).toEqual({});
  });

  it("a fresh tab is real and its requests are untouched", () => {
    expect(readAiTestMode()).toBe("real");
    const headers = { Authorization: "Bearer t" };
    expect(withAiTestModeHeader(headers)).toBe(headers);
    expect(aiTestModeHeaders()).toEqual({});
  });

  it("the stored mode rides every header set", () => {
    setAiTestMode("stand_in");
    expect(window.sessionStorage.getItem(AI_TEST_MODE_STORAGE_KEY)).toBe("stand_in");
    expect(withAiTestModeHeader({ A: "1" })).toEqual({ A: "1", [AI_TEST_MODE_HEADER]: "stand_in" });
    setAiTestMode("real");
    expect(window.sessionStorage.getItem(AI_TEST_MODE_STORAGE_KEY)).toBeNull();
    expect(withAiTestModeHeader({ A: "1" })).toEqual({ A: "1" });
  });

  it("a garbage stored value reads as real", () => {
    window.sessionStorage.setItem(AI_TEST_MODE_STORAGE_KEY, "free_money");
    expect(readAiTestMode()).toBe("real");
  });

  it("the organization-context seam carries it beside the org header", () => {
    setAiTestMode("replay");
    const headers = applyOrganizationContextHeader({}, ORG);
    expect(headers[AI_TEST_MODE_HEADER]).toBe("replay");
    setAiTestMode("real");
    expect(applyOrganizationContextHeader({}, ORG)[AI_TEST_MODE_HEADER]).toBeUndefined();
  });
});

describe("URL param", () => {
  it("parses only the three modes", () => {
    expect(aiTestModeFromSearch("?ai_test_mode=replay")).toBe("replay");
    expect(aiTestModeFromSearch("?ai_test_mode=nope")).toBeNull();
    expect(aiTestModeFromSearch("")).toBeNull();
  });

  it("?ai_test_mode= sets storage on the first read, before the dock mounts", () => {
    goTo("/marketing?ai_test_mode=stand_in");
    expect(readAiTestMode()).toBe("stand_in");
    expect(window.sessionStorage.getItem(AI_TEST_MODE_STORAGE_KEY)).toBe("stand_in");
  });

  it("capture stores the mode and strips only that param", () => {
    goTo("/marketing?run=abc&ai_test_mode=replay");
    expect(captureAiTestModeFromUrl()).toBe("replay");
    expect(window.location.search).toBe("?run=abc");
    expect(readAiTestMode()).toBe("replay");
  });

  it("?ai_test_mode=real resets the tab", () => {
    setAiTestMode("replay");
    goTo("/x?ai_test_mode=real");
    captureAiTestModeFromUrl();
    expect(window.sessionStorage.getItem(AI_TEST_MODE_STORAGE_KEY)).toBeNull();
    expect(aiTestModeHeaders()).toEqual({});
  });
});
