// The Activity tab's client half: parsing the RPC page, appending older pages without repeats or
// losing a failed source, grouping by local day, and one door per record type.

jest.mock("@/utils/supabase/client", () => ({ createClient: () => ({}) }));

import {
  activityRecordHref,
  appendActivityPage,
  groupActivityByDay,
  parseActivityPage,
  type ActivityItem,
  type ActivityPage,
} from "../userActivity";
import { isVisibleUserTab } from "../userSurfaces";

const item = (key: string, at: string, kind = "conversation"): ActivityItem => ({
  key,
  at,
  kind,
  title: key,
  detail: null,
  actor_id: null,
  record: null,
});

describe("parseActivityPage", () => {
  it("keeps well-formed items and sources and drops malformed rows", () => {
    const page = parseActivityPage({
      items: [
        { key: "a:1", at: "2026-10-18T05:00:00Z", kind: "admin", title: "Account close", detail: "spam", actor_id: "u2", record: { type: "admin_history", id: "1", user_id: "u1" } },
        { at: "2026-10-18T04:00:00Z", kind: "admin" },
        "junk",
      ],
      next_before: "2026-10-18T04:00:00Z",
      sources: [{ kind: "admin", ok: true }, { kind: "sms", ok: false, error: "boom" }],
    });
    expect(page.items.map((i) => i.key)).toEqual(["a:1"]);
    expect(page.items[0].record).toEqual({ type: "admin_history", id: "1", user_id: "u1", href: null });
    expect(page.sources).toEqual([
      { kind: "admin", ok: true, error: null },
      { kind: "sms", ok: false, error: "boom" },
    ]);
    expect(page.next_before).toBe("2026-10-18T04:00:00Z");
  });

  it("refuses a non-object answer", () => {
    expect(() => parseActivityPage(null)).toThrow();
  });
});

describe("appendActivityPage", () => {
  const first: ActivityPage = {
    items: [item("c:1", "2026-10-18T05:00:00Z"), item("c:2", "2026-10-18T04:00:00Z")],
    next_before: "2026-10-18T04:00:00Z",
    sources: [
      { kind: "conversation", ok: true, error: null },
      { kind: "sms", ok: false, error: "boom" },
    ],
  };

  it("drops a row repeated at the inclusive page edge and moves the cursor", () => {
    const next: ActivityPage = {
      items: [item("c:2", "2026-10-18T04:00:00Z"), item("c:3", "2026-10-18T03:00:00Z")],
      next_before: null,
      sources: [
        { kind: "conversation", ok: true, error: null },
        { kind: "sms", ok: true, error: null },
      ],
    };
    const merged = appendActivityPage(first, next);
    expect(merged.items.map((i) => i.key)).toEqual(["c:1", "c:2", "c:3"]);
    expect(merged.next_before).toBeNull();
    // sms failed on the first page: its rows there are still missing, so it stays reported.
    expect(merged.sources.find((s) => s.kind === "sms")).toEqual({ kind: "sms", ok: false, error: "boom" });
    expect(merged.sources.find((s) => s.kind === "conversation")?.ok).toBe(true);
  });
});

describe("groupActivityByDay", () => {
  it("groups newest-first items into Today, Yesterday and dated days", () => {
    const now = new Date(2026, 9, 18, 12, 0, 0);
    const days = groupActivityByDay(
      [
        item("a", new Date(2026, 9, 18, 9).toISOString()),
        item("b", new Date(2026, 9, 18, 1).toISOString()),
        item("c", new Date(2026, 9, 17, 23).toISOString()),
        item("d", new Date(2026, 9, 10, 8).toISOString()),
      ],
      now,
    );
    expect(days.map((d) => [d.label === "Today" || d.label === "Yesterday" ? d.label : "dated", d.items.map((i) => i.key)])).toEqual([
      ["Today", ["a", "b"]],
      ["Yesterday", ["c"]],
      ["dated", ["d"]],
    ]);
  });
});

describe("activityRecordHref", () => {
  const me = "11111111-1111-1111-1111-111111111111";
  it("opens each record type at its one door", () => {
    expect(activityRecordHref({ type: "admin_history", id: "x", user_id: me, href: null }, me)).toBe(`/administration/users/${me}/history`);
    expect(activityRecordHref({ type: "support_session", id: "s", user_id: "u2", href: null }, me)).toBe("/administration/users/u2/support");
    expect(activityRecordHref({ type: "conversation", id: "c1", user_id: null, href: null }, me)).toBe("/administration/chat/cx-dashboard/conversations/c1");
    expect(activityRecordHref({ type: "feedback", id: "f1", user_id: null, href: null }, me)).toBe("/administration/users/feedback?feedback=f1");
    expect(activityRecordHref({ type: "billing", id: "g", user_id: me, href: null }, me)).toBe(`/administration/users/${me}/billing`);
    expect(activityRecordHref({ type: "notification", id: "n", user_id: null, href: "/chat/abc" }, me)).toBe("/chat/abc");
  });
  it("opens a sign-in on the Security tab only while that tab is built", () => {
    expect(activityRecordHref({ type: "auth_session", id: "s", user_id: null, href: null }, me)).toBe(
      isVisibleUserTab("security") ? `/administration/users/${me}/security` : null,
    );
  });
  it("returns null for records with no page and for off-site notification links", () => {
    expect(activityRecordHref({ type: "agent_run", id: "r", user_id: null, href: null }, me)).toBeNull();
    expect(activityRecordHref({ type: "notification", id: "n", user_id: null, href: "https://evil.example" }, me)).toBeNull();
    expect(activityRecordHref(null, me)).toBeNull();
  });
});
