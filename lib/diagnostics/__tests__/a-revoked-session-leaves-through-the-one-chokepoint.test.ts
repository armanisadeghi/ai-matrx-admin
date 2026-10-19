/** @jest-environment node */
// Every client (serverApi, python-client, callApi) reports failures through captureApiError, so a
// 401 auth_required reaching it must start the one session-lost answer — not each feature.
const note = jest.fn(async (..._args: unknown[]) => "ignored");
jest.mock("@/lib/api/session-lost", () => ({ noteServerSessionRefusal: (...a: unknown[]) => note(...a) }));

import { captureApiError } from "../captureApiError";
import type { ApiCallError } from "@/lib/api/call-api";

it("hands a 401 auth_required to the session-lost handler", () => {
  captureApiError(
    { type: "http_error", name: "BackendApiError", message: "Authentication required", status: 401, code: "auth_required" } as ApiCallError,
    { url: "https://server.test/agent-factory/builds", method: "POST", path: "/agent-factory/builds" },
  );
  expect(note).toHaveBeenCalledWith({ status: 401, code: "auth_required", message: "Authentication required" });
});
