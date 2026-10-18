/**
 * The announcement read happens in the browser, straight to Supabase, and only after the page has
 * settled (the load law). Red on the old reader: it called a Next server action (a POST to the page
 * URL) the moment it mounted, before settle.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";

let settled = false;
const reads: string[] = [];
const row = {
  id: "a1", title: "T", message: "M", announcement_type: "info", is_active: true, deleted_at: null, target_user_id: null,
  created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z", created_by: null,
  min_display_seconds: 0, metadata: null,
};

// "settled" = the engaged-late tier: the page settled AND the person engaged it (2026-10-17).
jest.mock("@/lib/boot/engagedLate", () => ({ useEngagedLateReady: () => settled }));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: () => [],
}));
jest.mock("../SystemAnnouncementBanner", () => ({
  __esModule: true,
  default: ({ announcement }: { announcement: { id: string } }) => <div data-testid="banner">{announcement.id}</div>,
}));
jest.mock("@/utils/supabase/clientClaimsCache", () => ({
  getClientClaimsUserCached: async () => ({ data: { user: { id: "u1" } }, error: null }),
}));
jest.mock("@/utils/supabase/client", () => {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "or"]) q[m] = () => q;
  q.order = async () => ({ data: [row], error: null });
  return {
    createClient: () => ({
      schema: (s: string) => ({
        from: (t: string) => {
          reads.push(`${s}.${t}`);
          return q;
        },
      }),
    }),
  };
});
jest.mock("@/actions/feedback.actions", () => ({
  getActiveAnnouncements: () => {
    reads.push("SERVER_ACTION");
    return Promise.resolve({ success: true, data: [] });
  },
}), { virtual: true });

import AnnouncementProviderImpl from "../AnnouncementProviderImpl";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("reads nothing before settle, then reads users.system_announcements via Supabase", async () => {
  const host = document.createElement("div");
  const root = createRoot(host);
  await act(async () => root.render(<AnnouncementProviderImpl />));
  expect(reads).toEqual([]);
  settled = true;
  await act(async () => root.render(<AnnouncementProviderImpl key="again" />));
  expect(reads).toEqual(["users.system_announcements"]);
  expect(host.textContent).toContain("a1");
});
