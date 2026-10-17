import { postJson } from "@/lib/python-client";
import { mintStreamTicket, parseHandoffReason } from "./service";

jest.mock("@/lib/python-client", () => ({
  getJson: jest.fn(),
  postJson: jest.fn(),
  requestRaw: jest.fn(async () => ({ ok: true })),
}));

jest.mock("@/lib/redux/store-singleton", () => ({
  getStore: () => mockStreamTicketStore,
  getStoreSingleton: () => mockStreamTicketStore,
}));

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { access_token: "test-access-token" } },
        error: null,
      })),
    },
  },
}));

jest.mock("@/utils/permissions/access", () => ({
  getResourceAccess: jest.fn(),
}));

const ticketResponse = {
  ticket: "one-use-ticket",
  expires_at: 1_800_000_000,
  endpoint: "https://stream.aimatrx.com/cb-session/",
  entryCode: null,
  stream_session_id: "session",
  control: {
    control_revision: 3,
    lease_expires_at: 1_800_000_100,
    renew_interval_seconds: 20,
  },
  media: { video: true, audio: false, clipboard: false },
  viewport: { width: 1920, height: 1080 },
};

const mockStreamTicketStore = {
  getState: () => ({
    appContext: {
      organization_id: "5dc930e9-bd65-44a1-8369-af773f6e1a5b",
      orgBootstrapResolved: true,
    },
  }),
  subscribe: () => () => undefined,
};

describe("mintStreamTicket", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(postJson).mockResolvedValue({
      data: ticketResponse,
      meta: { requestId: "request-1", status: 200, serverRequestId: null },
    });
    global.fetch = jest.fn(async () => ({ ok: true }) as Response);
  });

  it("does not supersede a live controller on the first connection", async () => {
    await mintStreamTicket("run-1", "control");

    expect(postJson).toHaveBeenCalledWith(
      "/browser-manager/runs/run-1/stream-ticket",
      { mode: "control", takeover: false },
      { organizationId: "5dc930e9-bd65-44a1-8369-af773f6e1a5b" },
    );
  });

  it("supersedes the prior stream ticket during an explicit reconnect", async () => {
    await mintStreamTicket("run-1", "control", true);

    expect(postJson).toHaveBeenCalledWith(
      "/browser-manager/runs/run-1/stream-ticket",
      { mode: "control", takeover: true },
      { organizationId: "5dc930e9-bd65-44a1-8369-af773f6e1a5b" },
    );
  });
});

describe("parseHandoffReason", () => {
  it("accepts immediate user takeover and provider-revocation reasons", () => {
    expect(parseHandoffReason("user_requested")).toBe("user_requested");
    expect(parseHandoffReason("session_revoked_by_provider")).toBe(
      "session_revoked_by_provider",
    );
  });

  it("refuses values outside the generated server contract", () => {
    expect(() => parseHandoffReason("invented_reason")).toThrow(
      "Unknown browser handoff reason: invented_reason",
    );
  });
});

describe("browserActionBlockedReason", () => {
  it("names the missing organization instead of letting a click do nothing", () => {
    jest.isolateModules(() => {
      jest.doMock("@/lib/api/organization-admission", () => ({
        peekSelectedOrganizationId: () => null,
        waitForOrganizationAdmission: async () => "unresolved",
      }));
       
      const { browserActionBlockedReason } = require("./service") as typeof import("./service");
      expect(browserActionBlockedReason()).toMatch(/Choose an organization/);
    });
  });

  it("is silent when an organization is selected", () => {
    jest.isolateModules(() => {
      jest.doMock("@/lib/api/organization-admission", () => ({
        peekSelectedOrganizationId: () => "5dc930e9-bd65-44a1-8369-af773f6e1a5b",
        waitForOrganizationAdmission: async () => "ready",
      }));
       
      const { browserActionBlockedReason } = require("./service") as typeof import("./service");
      expect(browserActionBlockedReason()).toBeNull();
    });
  });
});

describe("isViewStreamUnavailable", () => {
  // Live 2026-10-17: a server without the watch stream answers a view mint 422
  // ("mode was not one of the choices"); the Computer tab must fall back, not error.
  it("is the fallback for a 409 or a 422 view refusal, never for other failures", () => {
    const { isViewStreamUnavailable: unavailable } = jest.requireActual<typeof import("./service")>("./service");
    const { BackendApiError: Err } = jest.requireActual<typeof import("@ai-matrx/api")>("@ai-matrx/api");
    const err = (status: number, code = "validation_error") =>
      new Err({ code: code as never, detail: "", userMessage: "", status });
    expect(unavailable(err(422))).toBe(true);
    expect(unavailable(err(409, "not_controller"))).toBe(true);
    expect(unavailable(err(500, "internal_error"))).toBe(false);
    expect(unavailable(new Error("x"))).toBe(false);
  });
});
