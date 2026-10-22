import { uploadFileWithProgress } from "./files";

jest.mock("@/lib/api/server-api", () =>
  require("@/lib/api/test-support/recordingServerApi").recordingServerApiModule(),
);

const api = jest.requireMock("@/lib/api/server-api");

it("sends strict force-new-copy intent and reason in multipart, with progress", async () => {
  api.respondWith(() => ({ file_id: "copy-2", file_path: "copy (1).txt" }));
  const file = new File(["same bytes"], "copy.txt", { type: "text/plain" });

  const { data } = await uploadFileWithProgress(
    {
      file,
      filePath: "copy (1).txt",
      intent: "force_new_copy",
      reason: "User selected Make a copy in the duplicate upload dialog",
    },
    jest.fn(),
  );

  expect(data.file_id).toBe("copy-2");
  const call = api.lastServerApiCall();
  expect(call.path).toBe("/files/upload");
  expect(typeof call.options.onUploadProgress).toBe("function");
  const form = call.args.body as FormData;
  expect(form.get("intent")).toBe("force_new_copy");
  expect(form.get("reason")).toBe(
    "User selected Make a copy in the duplicate upload dialog",
  );
});
