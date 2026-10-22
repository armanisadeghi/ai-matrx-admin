/**
 * GATES-TAIL (VERIFIER-21 #2): a request about ONE file carries that file's own organization,
 * read from the file, so `/files/f/<id>` opens in a session with no organization picked.
 * Red on the pre-fix files.ts (every per-file call went out with the caller's bare opts, so no
 * X-Organization-Id reached the files service and it answered 400 "Choose the organization").
 */
import {
  deleteFile,
  downloadFile,
  downloadFileWithProgress,
  getFile,
  getFileMetadata,
  patchFile,
  renameFile,
  restoreFile,
} from "../files";
import {
  __resetFileOrganizationsForTest,
  rememberFileOrganization,
} from "../fileOrganization";

jest.mock("@/lib/api/server-api", () =>
  require("@/lib/api/test-support/recordingServerApi").recordingServerApiModule(),
);
jest.mock("@/lib/redux/store-singleton", () => ({
  getStoreSingleton: () => ({
    getState: () => ({
      // The active selection is EMPTY — the header reads "Choose org".
      appContext: { organization_id: null },
      cloudFiles: { filesById: { "f-slice": { organizationId: "org-from-slice" } } },
    }),
  }),
}));

const api = jest.requireMock("@/lib/api/server-api");
const FILE = "503e2c1f-7b89-5908-891a-18ca0282fc04";
const ORG = "884d1ce8-0000-4000-8000-000000000001";
const lastOrg = () => api.lastServerApiCall()?.options?.organizationId;

beforeEach(() => {
  api.resetServerApiCalls();
  api.respondWith((call: { method: string; path: string }) =>
    call.method === "GET" && call.path === "/files/f-2" ? { id: "f-2", organization_id: "org-of-f2" } : {},
  );
  __resetFileOrganizationsForTest();
  rememberFileOrganization(FILE, ORG);
});

it("every read and write about one file names the file's organization", async () => {
  await getFileMetadata(FILE);
  expect(lastOrg()).toBe(ORG);
  await getFile(FILE);
  expect(lastOrg()).toBe(ORG);
  await downloadFile(FILE);
  expect(lastOrg()).toBe(ORG);
  await downloadFileWithProgress(FILE, jest.fn());
  expect(lastOrg()).toBe(ORG);
  await patchFile(FILE, { visibility: "private" } as never);
  expect(lastOrg()).toBe(ORG);
  await deleteFile(FILE);
  expect(lastOrg()).toBe(ORG);
  await restoreFile(FILE);
  expect(lastOrg()).toBe(ORG);
  await renameFile(FILE, { new_path: "a.txt" } as never);
  expect(lastOrg()).toBe(ORG);
});

it("a file already in the files slice is sent in its own organization", async () => {
  await downloadFile("f-slice");
  expect(lastOrg()).toBe("org-from-slice");
});

it("a per-file read that answers remembers the row's organization for the next request", async () => {
  await getFileMetadata("f-2");
  await downloadFile("f-2");
  expect(lastOrg()).toBe("org-of-f2");
});

it("an organization the caller named still wins", async () => {
  await downloadFile(FILE, {}, { organizationId: "caller-org" });
  expect(lastOrg()).toBe("caller-org");
});

it("a file nobody has told us about goes as before — nothing is guessed from the picker", async () => {
  await downloadFile("unknown-file");
  expect(lastOrg()).toBeUndefined();
});
