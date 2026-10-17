/**
 * A record shared from an organization she is not in must not ask that
 * organization's member-only doors (page-pass 2026-09-27, /crm/<id>: a 403 from
 * `platform.unified_data_store_on` on every load of the custom-fields section).
 *
 * An ARCHIVED organization is not one she is in either (2026-10-08): her
 * membership row is kept, but every member-only door refuses it — /education/kits
 * drew one 403 per archived organization (100 for the test admin) per load.
 */
/**
 * BOUNDED ORGANIZATIONS (2026-10-17): membership is asked BY ID (`iam.my_organizations_by_ids`), never
 * answered from a list that is only her first page — a person in 300 organizations is a member of the
 * 251st, and the old answer ("not on my page, so not hers") withheld her own record's custom fields.
 */
const mockByIds = jest.fn();
jest.mock("@/features/organizations/service", () => ({
  getMyOrganizationsByIds: (ids: string[]) => mockByIds(ids),
}));
jest.mock("@/features/organizations/service/memberOrganizationRows", () => ({
  onMemberOrganizationsForgotten: jest.fn(),
  readMemberOrganizationRows: jest.fn(),
}));

import { __resetOrganizationsIAmInForTest, askAsMember } from "@/features/organizations/organizationsIAmIn";

const MINE = "11111111-1111-4111-8111-111111111111";
const THEIRS = "22222222-2222-4222-8222-222222222222";
const ARCHIVED = "33333333-3333-4333-8333-333333333333";

const org = (id: string, archivedAt: string | null = null) => ({ id, name: id, role: "member", archivedAt });
/** The by-id door answers only the ids she is a member of. */
const door = (...mine: Array<ReturnType<typeof org>>) => async (ids: string[]) => mine.filter((o) => ids.includes(o.id));

describe("askAsMember", () => {
  beforeEach(() => {
    __resetOrganizationsIAmInForTest();
    mockByIds.mockReset();
  });

  it("asks the door for an organization she is in — however far down her list it is", async () => {
    mockByIds.mockImplementation(door(org(MINE)));
    const ask = jest.fn().mockResolvedValue(true);
    await expect(askAsMember(MINE, ask, false)).resolves.toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(mockByIds).toHaveBeenCalledWith([MINE]);
  });

  it("answers OFF with NO request for an organization she is not in", async () => {
    mockByIds.mockImplementation(door(org(MINE)));
    const ask = jest.fn().mockResolvedValue(true);
    await expect(askAsMember(THEIRS, ask, false)).resolves.toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it("answers OFF with NO request for an archived organization she still holds a membership row in", async () => {
    mockByIds.mockImplementation(door(org(MINE), org(ARCHIVED, "2026-10-01T00:00:00Z")));
    const ask = jest.fn().mockResolvedValue(true);
    await expect(askAsMember(ARCHIVED, ask, false)).resolves.toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it("asks as before when her membership could not be read", async () => {
    mockByIds.mockRejectedValue(new Error("timeout"));
    const ask = jest.fn().mockResolvedValue(true);
    await expect(askAsMember(THEIRS, ask, false)).resolves.toBe(true);
    expect(ask).toHaveBeenCalledTimes(1);
  });

  it("coalesces asks made in the same tick into ONE by-id call and remembers every answer", async () => {
    mockByIds.mockImplementation(door(org(MINE)));
    await Promise.all([askAsMember(MINE, async () => 1, 0), askAsMember(THEIRS, async () => 1, 0)]);
    await askAsMember(MINE, async () => 1, 0);
    await askAsMember(THEIRS, async () => 1, 0);
    expect(mockByIds).toHaveBeenCalledTimes(1);
  });
});
