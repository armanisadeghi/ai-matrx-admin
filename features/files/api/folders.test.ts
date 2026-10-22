import { ensureFolderPath } from "./folders";

jest.mock("@/lib/api/server-api", () =>
  require("@/lib/api/test-support/recordingServerApi").recordingServerApiModule(),
);

const api = jest.requireMock("@/lib/api/server-api");

describe("ensureFolderPath", () => {
  beforeEach(() => {
    api.resetServerApiCalls();
    api.respondWith(() => ({ id: "leaf-folder" }));
  });

  it("normalizes the path and delegates the whole chain to one request", async () => {
    await ensureFolderPath(" /Images// Generated / Chat/ ", "personal", {
      requestId: "request-1",
    });

    expect(api.serverApiCalls).toHaveLength(1);
    const call = api.lastServerApiCall();
    expect(call.method).toBe("POST");
    expect(call.path).toBe("/folders");
    expect(call.args.body).toEqual({
      folder_path: "Images/Generated/Chat",
      visibility: "personal",
      metadata: null,
    });
    expect(call.options).toMatchObject({ requestId: "request-1" });
  });

  it("rejects an empty logical path without making a request", async () => {
    await expect(ensureFolderPath(" /// ")).rejects.toThrow(
      "folderPath cannot be empty.",
    );
    expect(api.serverApiCalls).toHaveLength(0);
  });
});
