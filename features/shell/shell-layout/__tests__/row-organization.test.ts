// A stored layout is read BY ID in the organization the row lives in — never the page's active one.
// Before (2026-10-22 audit): History asked `record_history` under the active organization, the store
// answered [] for a row in another organization, and the popover was blank for every multi-org person.
const made: Array<{ organizationId: string; recordHistory: jest.Mock; restorePreview: jest.Mock; recordHeaders: jest.Mock }> = [];
function fakeClient(organizationId: string) {
  const c = {
    config: { organizationId, organizationIds: [] as string[] },
    organizationId,
    recordHistory: jest.fn(async () => ({ ok: true, data: [{ version: 3 }] })),
    restorePreview: jest.fn(async () => ({ ok: true, data: { changes: [] } })),
    recordHeaders: jest.fn(async () => ({ ok: true, data: [{ id: "rec-1", version: 3 }] })),
  };
  made.push(c);
  return c;
}
jest.mock("@ai-matrx/records/core", () => ({
  createRecordsClient: (config: { organizationId: string }) => fakeClient(config.organizationId),
  clientInOrganization: (client: { organizationId: string }, organizationId: string | null | undefined) =>
    !organizationId || organizationId === client.organizationId ? client : fakeClient(organizationId),
}));
jest.mock("@ai-matrx/records/react", () => ({ removeAppRow: jest.fn(), upsertAppRow: jest.fn() }));
jest.mock("@ai-matrx/records/versions", () => ({
  readVersionNow: async (client: { recordHeaders: (a: unknown) => Promise<{ data: Array<{ version: number }> }> }, id: string) =>
    (await client.recordHeaders({ ids: [id] })).data[0]?.version ?? null,
}));

import { listShellLayoutVersions, previewShellLayoutVersion, readShellLayoutVersionNow } from "../service";

const ACTIVE = "org-active";
const HOME = "org-home";
const row = { recordId: "rec-1", organizationId: HOME };

beforeEach(() => void (made.length = 0));

it("lists a layout's versions in the organization its row lives in, not the active one", async () => {
  const page = fakeClient(ACTIVE);
  const answer = await listShellLayoutVersions(page as never, row);
  expect(page.recordHistory).not.toHaveBeenCalled();
  const home = made.find((c) => c.organizationId === HOME);
  expect(home?.recordHistory).toHaveBeenCalledWith({ record_id: "rec-1", limit: 50 });
  expect(answer).toEqual({ ok: true, data: [{ version: 3 }] });
});

it("previews and reads the version in the row's organization too", async () => {
  const page = fakeClient(ACTIVE);
  await previewShellLayoutVersion(page as never, row, 2);
  expect(await readShellLayoutVersionNow(page as never, row)).toBe(3);
  expect(page.restorePreview).not.toHaveBeenCalled();
  expect(page.recordHeaders).not.toHaveBeenCalled();
});

it("uses the page's client unchanged when the row is in the active organization", async () => {
  const page = fakeClient(ACTIVE);
  await listShellLayoutVersions(page as never, { recordId: "rec-1", organizationId: ACTIVE });
  expect(page.recordHistory).toHaveBeenCalledTimes(1);
});
