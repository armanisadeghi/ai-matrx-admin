/**
 * The package comment threads (canvas, popover, tasks, records) speak the same signed-out
 * sentence the annotations sidecar does, and a signed-in grant gap stays "Permission denied".
 * The host decides which by binding `identity.sessionAttached` (@ai-matrx/associations 0.14.80):
 * unbound, every 42501 "permission denied for function" read as signed out — including a
 * signed-in person on a door they hold no EXECUTE on. And the Sign in port opens a NEW tab.
 */

const rpcMock = jest.fn();
let mockSession = "attached";

jest.mock("@/utils/supabase/client", () => {
  const client = {
    rpc: (fn: string, args: Record<string, unknown>) => rpcMock(fn, args),
    from: jest.fn(),
    schema: () => client,
  };
  return { supabase: client };
});
jest.mock("@/utils/auth/getUserId", () => ({ requireUserId: () => "user-1" }));
jest.mock("@/utils/supabase/sessionBarrier", () => ({ sessionStateNow: () => mockSession }));
const openFromNotice = jest.fn();
jest.mock("@/lib/notice-open/openFromNotice", () => ({ openFromNotice: (href: string) => openFromNotice(href) }));

import { getAssociationsStore } from "../associationsStore";
import { openSignInAgain } from "@/features/rich-document/annotations/signed-out";

const ID = "00000000-0000-4000-8000-000000000001";
const refusal = { data: null, error: { code: "42501", details: null, hint: null, message: "permission denied for function cmt_list" }, status: 401 };

describe("package comment threads: signed out vs permission", () => {
  beforeEach(() => rpcMock.mockReset().mockResolvedValue(refusal));

  it("a tab whose session is not attached is told it is signed out", async () => {
    mockSession = "absent";
    const res = await getAssociationsStore().services.comments.listForEntity("task", ID);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("unauthorized");
      expect(res.error.message.startsWith("You're signed out")).toBe(true);
    }
  });

  it("a signed-in person missing a grant still reads Permission denied", async () => {
    mockSession = "attached";
    const res = await getAssociationsStore().services.comments.listForEntity("task", ID);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("forbidden_org");
      expect(res.error.message).toBe("Permission denied");
    }
  });

  it("Sign in opens the login in a new tab carrying this page as the destination", () => {
    window.history.pushState({}, "", "/tasks/abc?x=1");
    openSignInAgain();
    expect(openFromNotice).toHaveBeenCalledWith(expect.stringMatching(/^\/login\?.*tasks%2Fabc/));
  });
});
