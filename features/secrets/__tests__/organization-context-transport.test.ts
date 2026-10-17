import { setStoreSingleton } from "@/lib/redux/store-singleton";
import { createVaultItem, restoreVaultItem } from "../vault-service";

const ACCESS_TOKEN = "test-access-token";
const ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";
const mockGetSession = jest.fn(async () => ({
  data: { session: { access_token: ACCESS_TOKEN, user: { id: "user-1" } } },
}));
const mockGetClaims = jest.fn<
  Promise<{
    data: {
      claims: {
        sub: string;
        email: string;
        app_metadata: {};
        user_metadata: {};
      };
    };
    error: null;
  }>,
  [string?]
>(async () => ({
  data: {
    claims: {
      sub: "user-1",
      email: "admin@admin.com",
      app_metadata: {},
      user_metadata: {},
    },
  },
  error: null,
}));

jest.mock("@/utils/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      getClaims: mockGetClaims,
    },
  }),
}));

function installContext(organizationId: string | null): void {
  setStoreSingleton({
    getState: () => ({
      appContext: {
        organization_id: organizationId,
        // The load ladder has answered: a write now carries the active organization.
        orgBootstrapResolved: true,
      },
    }),
  } as never);
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

function errorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => "",
  } as Response;
}

function sentHeaders(fetchMock: jest.Mock, call = 0): Headers {
  return new Headers(fetchMock.mock.calls[call]?.[1]?.headers);
}

describe("Vault restore and create organization transport", () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeEach(() => {
    fetchMock.mockReset();
    mockGetSession.mockClear();
    mockGetClaims.mockClear();
    global.fetch = fetchMock as typeof fetch;
    installContext(ORGANIZATION_ID);
  });


  test("restore sends the frozen actor and recognizes only the root fresh-auth envelope", async () => {
    fetchMock.mockResolvedValueOnce({
      ...errorResponse(403),
      json: async () => ({ code: "recent_auth_required" }),
    } as Response);
    await expect(
      restoreVaultItem("item-1", "00000000-0000-4000-8000-000000000001", {
        userId: "user-1",
        organizationId: ORGANIZATION_ID,
      }),
    ).rejects.toMatchObject({ code: "recent_auth_required" });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        deletion_id: "00000000-0000-4000-8000-000000000001",
      }),
    });
    expect(sentHeaders(fetchMock).get("x-organization-id")).toBe(
      ORGANIZATION_ID,
    );
  });

  test("restore refuses a source-route nested error envelope", async () => {
    fetchMock.mockResolvedValueOnce({
      ...errorResponse(403),
      json: async () => ({ detail: { code: "recent_auth_required" } }),
    } as Response);
    await expect(
      restoreVaultItem("item-1", "00000000-0000-4000-8000-000000000001", {
        userId: "user-1",
        organizationId: ORGANIZATION_ID,
      }),
    ).rejects.toMatchObject({ code: "request_rejected" });
  });

  test("restore names a native compatibility 503 instead of a generic retry", async () => {
    fetchMock.mockResolvedValueOnce({
      ...errorResponse(503),
      json: async () => ({ detail: { code: "native_passkeys_unavailable" } }),
    } as Response);
    await expect(
      restoreVaultItem("item-1", "00000000-0000-4000-8000-000000000001", {
        userId: "user-1",
        organizationId: ORGANIZATION_ID,
      }),
    ).rejects.toMatchObject({ code: "native_recovery_unavailable" });
  });

  test("restore accepts the exact native passkey result count", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        restored_fields: 1,
        restored_attachments: 0,
        restored_native_passkeys: 1,
        already_restored: false,
        notice: "sharing_and_automatic_use_off",
      }),
    );
    await expect(
      restoreVaultItem("item-1", "00000000-0000-4000-8000-000000000001", {
        userId: "user-1",
        organizationId: ORGANIZATION_ID,
      }),
    ).resolves.toMatchObject({ restored_native_passkeys: 1 });
  });

  test("restore rejects a malformed success payload at ingress", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ restored_fields: 1 }));
    await expect(
      restoreVaultItem("item-1", "00000000-0000-4000-8000-000000000001", {
        userId: "user-1",
        organizationId: ORGANIZATION_ID,
      }),
    ).rejects.toMatchObject({ code: "request_rejected" });
  });

  test("an ordinary create preserves an unreadable successful response as a decode failure", async () => {
    const decodeFailure = new SyntaxError("truncated response");
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw decodeFailure;
      },
    } as unknown as Response);

    await expect(
      createVaultItem({ display_name: "Created", source: "manual" }),
    ).rejects.toBe(decodeFailure);
  });

  test.each([408, 429, 500, 502, 503, 504])(
    "ambiguous import response %i keeps the frozen idempotency command retryable",
    async (status) => {
      fetchMock.mockResolvedValueOnce(errorResponse(status));
      await expect(
        createVaultItem(
          { display_name: "Imported", source: "system_import" },
          {
            idempotencyKey: "00000000-0000-4000-8000-000000000001",
            expectedActor: {
              userId: "user-1",
              organizationId: ORGANIZATION_ID,
            },
          },
        ),
      ).rejects.toMatchObject({ code: "retryable" });
    },
  );
});
