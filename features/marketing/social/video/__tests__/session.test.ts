import { BackendApiError } from "@ai-matrx/api";

import { isSessionExpired } from "../session";

describe("expired session in the video studio", () => {
  it("reads a 401 and the client's own sign-in refusal as expired", () => {
    expect(isSessionExpired(new BackendApiError({ code: "unauthorized", detail: "x", userMessage: "x", status: 401 }))).toBe(true);
    expect(isSessionExpired(new BackendApiError({ code: "auth_required", detail: "x", userMessage: "x", status: 400 }))).toBe(true);
  });
  it("leaves every other failure alone", () => {
    expect(isSessionExpired(new BackendApiError({ code: "not_found", detail: "x", userMessage: "x", status: 404 }))).toBe(false);
    expect(isSessionExpired(new Error("boom"))).toBe(false);
    expect(isSessionExpired(null)).toBe(false);
  });
});
