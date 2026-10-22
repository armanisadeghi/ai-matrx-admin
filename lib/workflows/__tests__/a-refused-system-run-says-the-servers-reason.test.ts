/**
 * Live walk 2026-10-22: a refused build start (422 invalid_source_feature) printed only
 * "Invalid request" with no reason. startSystemRun is the one place a server refusal becomes text
 * for every system-run caller, so it must carry the server's own reason, never the generic default.
 */
import { startSystemRun } from "../system-runs";

jest.mock("@/lib/api/call-api", () => ({ callApi: (args: unknown) => () => Promise.resolve(mockResult(args)) }));
let mockResult: (args: unknown) => unknown = () => ({});

const dispatch = ((thunk: unknown) => (typeof thunk === "function" ? (thunk as () => unknown)() : thunk)) as never;
const input = { subject: "build:1", organizationId: "o", sourceFeature: "studio", inputs: {} };

describe("a refused system-run start", () => {
  it("shows the server's own reason, not the generic invalid-request sentence", async () => {
    mockResult = () => ({
      error: {
        status: 422,
        message: "Invalid request. Please check your input and try again.",
        serverDetail: { detail: { error: "invalid_source_feature", message: "unregistered source_feature 'studio'" } },
      },
    });
    await expect(startSystemRun(dispatch, "agent_build", input, "The agent build did not start")).rejects.toThrow(
      "unregistered source_feature 'studio'",
    );
  });

  it("uses the caller's plain sentence when the server gave only the generic default", async () => {
    mockResult = () => ({ error: { status: 422, message: "Invalid request. Please check your input and try again.", serverDetail: {} } });
    await expect(startSystemRun(dispatch, "agent_build", input, "The agent build did not start")).rejects.toThrow(
      "The agent build did not start",
    );
  });
});
