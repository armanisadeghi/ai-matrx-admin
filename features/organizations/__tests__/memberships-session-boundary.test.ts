const mockRpc = jest.fn();
const mockGetSession = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    // PostgREST builder shape: `.order().range()` chain, awaited at the end (the read is paged).
    rpc: (...args: unknown[]) => {
      const answer = mockRpc(...args);
      const chain: any = {
        order: () => chain,
        range: () => chain,
        then: (res: any, rej: any) => Promise.resolve(answer).then(res, rej),
      };
      return chain;
    },
    auth: { getSession: mockGetSession, onAuthStateChange: jest.fn() },
  },
}));

jest.mock("@/utils/auth/getUserId", () => ({
  requireUserId: jest.fn(() => "user-1"),
}));

// A fresh service per test: `forUser` keeps a short-lived success cache, so one test's good read
// would otherwise answer the next test's call before it ever reaches the (mocked) session/RPC.
let membershipsService: typeof import("../service/membershipsService").membershipsService;

const MEMBERSHIP_ROW = {
  id: "membership-1",
  organization_id: "organization-1",
  container_id: "organization-1",
  user_id: "user-1",
  role: "owner",
  status: "active",
  created_at: "2026-08-25T00:00:00.000Z",
};

describe("membership read session boundary", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.isolateModules(() => {
      membershipsService = require("../service/membershipsService").membershipsService;
    });
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("recovers one anonymous 401 and repeats the idempotent read once", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "42501",
          message: "permission denied for function mbr_for_user",
        },
        status: 401,
      })
      .mockResolvedValueOnce({
        data: [MEMBERSHIP_ROW],
        error: null,
        status: 200,
      });
    mockGetSession
      .mockResolvedValueOnce({
        data: { session: { access_token: "initial-token" } },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { session: { access_token: "recovered-token" } },
        error: null,
      });

    const result = await membershipsService.forUser("organization");

    expect(result).toEqual({
      ok: true,
      data: {
        memberships: [
          {
            id: "membership-1",
            organizationId: "organization-1",
            containerId: "organization-1",
            userId: "user-1",
            role: "owner",
            status: "active",
            createdAt: "2026-08-25T00:00:00.000Z",
          },
        ],
      },
    });
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockGetSession).toHaveBeenCalledTimes(2);
    // The recovery SCREAMS — that is the guard. It logs the message alone:
    // since the retry moved into @ai-matrx/data (30082c3797, C22), the
    // package's logger omits the detail argument entirely when there is no
    // cause (`if (d === undefined) console.error(m)`), instead of the repo
    // copy's trailing `undefined`. Pinning that trailing argument pinned a
    // dead implementation detail, not the announcement.
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("recovery firing"),
    );
  });

  it("does not retry an authenticated 403 execute-grant defect", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "authenticated-token" } },
      error: null,
    });
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied for function mbr_for_user",
      },
      status: 403,
    });

    const result = await membershipsService.forUser("organization");

    expect(result).toMatchObject({
      ok: false,
      // The shared records mapper owns the code: SQLSTATE 42501 is a refused DOOR, and it carries the store's own sentence.
      error: { code: "door", message: "permission denied for function mbr_for_user" },
    });
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("does not call the membership RPC after the browser session is gone", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    const result = await membershipsService.forUser("organization");

    expect(result).toMatchObject({
      ok: false,
      // The package's SessionUnavailableError carries PGRST301, which the shared records mapper classes as a refused DOOR.
      error: { code: "door", message: "Your session expired" },
    });
    expect(mockRpc).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
