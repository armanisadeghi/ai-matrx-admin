/**
 * matrx-transport-for-conversation.test.ts — the conversation-scoped
 * `MatrxTransport`: base URL + credentials come from the SAME
 * `resolveBackendForConversation` the execute thunks use, and credentials ride
 * on top of the wire headers. `X-Organization-Id` is owned by the resolver
 * (conversation org, app-selection fallback) and passes through untouched.
 */

import type { ChatRootState } from "@ai-matrx/chat/store/root-state";

// The wire is the global fetch: @ai-matrx/api bundles its own resilientFetch,
// so the test fakes the network itself, never a module the client no longer
// imports by name.
const mockedFetch = jest.fn<Promise<Response>, [string, RequestInit | undefined]>();


// The host's own transport (behind the server port) reads these.

jest.mock("@ai-matrx/chat/agents/redux/execution-system/thunks/resolve-base-url", () => ({
  resolveBackendForConversation: jest.fn(),
}));

// jest.setup.ts has already pulled the app graph in; reset, then load the subject fresh so it
// binds the resolver mock above.
jest.resetModules();
/* eslint-disable @typescript-eslint/no-require-imports */
const { configureServerForTest } = require("@ai-matrx/chat/testing/server-test-host") as typeof import("@ai-matrx/chat/testing/server-test-host");
const { resolveBackendForConversation } = require("@ai-matrx/chat/agents/redux/execution-system/thunks/resolve-base-url") as typeof import("@ai-matrx/chat/agents/redux/execution-system/thunks/resolve-base-url");
const { createMatrxTransportForConversation } = require("@ai-matrx/chat/agents/redux/execution-system/thunks/matrx-transport-for-conversation") as typeof import("@ai-matrx/chat/agents/redux/execution-system/thunks/matrx-transport-for-conversation");
/* eslint-enable @typescript-eslint/no-require-imports */

const mockedResolve = resolveBackendForConversation as jest.Mock;
const getState = () =>
  ({ apiConfig: { activeServer: "production" } }) as unknown as ChatRootState;

beforeEach(() => {
  // The package hands its target to the host's transport (P9): this app's own.
  configureServerForTest({
    createMatrxTransportFromTarget: jest.requireActual("@host/lib/api/matrx-transport")
      .createMatrxTransportFromTarget,
  });
  mockedFetch.mockReset();
  mockedResolve.mockReset();
  mockedFetch.mockImplementation(async () => ({
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({}),
    clone() {
      return this;
    },
  }) as unknown as Response);
  globalThis.fetch = mockedFetch as unknown as typeof fetch;
});

describe("createMatrxTransportForConversation", () => {
  it("routes through the conversation's resolved backend with its credentials on top of wire headers", async () => {
    mockedResolve.mockReturnValue({
      baseUrl: "https://sandbox-proxy.test",
      channel: "override",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer conversation-jwt",
        "X-Organization-Id": "org-42",
      },
    });
    const transport = createMatrxTransportForConversation(getState, "conv-1");

    await transport.fetch("/ai/conversations/conv-1/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    expect(mockedResolve).toHaveBeenCalledWith(expect.anything(), "conv-1");
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe("https://sandbox-proxy.test/ai/conversations/conv-1/resume");
    const headers = init?.headers as Record<string, string>;
    expect(headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer conversation-jwt",
      // Organization admission: the resolver's header passes through as-is.
      "X-Organization-Id": "org-42",
    });
  });

  it("throws loudly when no backend URL is configured", async () => {
    mockedResolve.mockReturnValue(null);
    const transport = createMatrxTransportForConversation(getState, "conv-2");
    await expect(
      transport.fetch("/ai/conversations/conv-2", {
        method: "POST",
        headers: {},
        body: "{}",
      }),
    ).rejects.toThrow(/No backend URL configured/);
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
