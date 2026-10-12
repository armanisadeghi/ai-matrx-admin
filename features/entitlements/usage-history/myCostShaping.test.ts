import { NO_DRILL, chargeHref, chargeLink, costDisplay, dayWindow, drillInto, levelFor } from "./myCostShaping";
import { periodFor } from "./myCostService";

describe("my cost: periods", () => {
  // Wednesday 2026-10-14 15:30 local
  const now = new Date(2026, 9, 14, 15, 30);
  it("today starts at local midnight", () => {
    expect(periodFor("today", now).from).toBe(new Date(2026, 9, 14).toISOString());
  });
  it("a week starts on Monday", () => {
    expect(periodFor("week", now).from).toBe(new Date(2026, 9, 12).toISOString());
    expect(periodFor("week", new Date(2026, 9, 11, 9)).from).toBe(new Date(2026, 9, 5).toISOString()); // Sunday -> prior Monday
  });
  it("month starts on the 1st; all time has no bounds", () => {
    expect(periodFor("month", now).from).toBe(new Date(2026, 9, 1).toISOString());
    expect(periodFor("all", now)).toEqual({ key: "all", from: null, to: null });
  });
});

describe("my cost: drill-down shaping", () => {
  it("By activity goes feature -> activity -> charges", () => {
    expect(levelFor("feature", NO_DRILL)).toBe("feature");
    const a = drillInto("feature", NO_DRILL, { key: "social_data", label: "Social data" });
    expect(levelFor(a.tab, a.drill)).toBe("activity");
    const b = drillInto(a.tab, a.drill, { key: "x", label: "X" });
    expect(b.drill.feature?.key).toBe("social_data");
    expect(b.drill.activity?.key).toBe("x");
  });
  it("an organization row becomes the filter and returns to By activity", () => {
    const n = drillInto("organization", NO_DRILL, { key: "org-1", label: "Cedar" });
    expect(n.tab).toBe("feature");
    expect(n.organization).toEqual({ id: "org-1", label: "Cedar" });
  });
  it("a day opens that UTC day", () => {
    expect(drillInto("day", NO_DRILL, { key: "2026-10-11", label: "2026-10-11" }).drill.day).toBe("2026-10-11");
    expect(dayWindow("2026-10-11")).toEqual({ from: "2026-10-11T00:00:00.000Z", to: "2026-10-12T00:00:00.000Z" });
  });
});

describe("my cost: dollars for admins, points for members", () => {
  it("a member (no dollars) reads points only", () => {
    expect(costDisplay(null, 20000)).toEqual({ primary: "points", usd: null, points: 20000 });
  });
  it("an admin reads dollars with points beside, even when the cost is zero dollars", () => {
    expect(costDisplay(1, 20000)).toEqual({ primary: "usd", usd: 1, points: 20000 });
    expect(costDisplay(0, 0).primary).toBe("usd");
  });
});

describe("my cost: every charge opens what it was for", () => {
  const id = "11111111-2222-3333-4444-555555555555";
  const r = (feature: string, linkKind: string | null, linkId: string | null = id, conversationId: string | null = null) => ({ feature, linkKind, linkId, conversationId });
  it("maps each source to its record", () => {
    expect(chargeHref(r("ai_chat", "conversation", id, id))).toBe(`/chat/${id}`);
    expect(chargeHref(r("research", "rs_topic"))).toBe(`/research/topics/${id}`);
    expect(chargeHref(r("files", "cld_file"))).toBe(`/files/f/${id}`);
    expect(chargeHref(r("files", "processed_document"))).toBe(`/documents/${id}`);
    expect(chargeHref(r("ai_agents", "workflow"))).toBe(`/workflows/${id}`);
    expect(chargeHref(r("scheduled", "sch_run"))).toBe("/schedules");
    expect(chargeHref(r("scraping", "web_site"))).toBe("/scraper");
    expect(chargeHref(r("social_data", "external_api"))).toBe("/marketing/social");
  });
  it("never a dead end: a non-id link falls back to the activity's home", () => {
    expect(chargeHref(r("research", "rs_topic", "not-an-id"))).toBe("/research");
    expect(chargeHref(r("media", "image_generate"))).toBe("/images");
    expect(chargeHref(r("other", "mystery"))).toBeNull();
  });
});

describe("my cost: where a charge opens", () => {
  const base = { feature: "social_data", linkKind: "external_api", linkId: null, conversationId: null };
  it("a social charge opens the account it was for", () => {
    const r = { ...base, subjectKind: "account" as const, subjectPlatform: "tiktok", subjectId: "p-1", subjectBrandId: "b-1" };
    expect(chargeHref(r)).toBe("/marketing/b-1/socials/tiktok/p-1");
    expect(chargeLink(r)).toEqual({ href: "/marketing/b-1/socials/tiktok/p-1", label: "Open" });
  });
  it("a social charge opens the post it was for", () => {
    expect(chargeHref({ ...base, subjectKind: "post", subjectPlatform: "instagram", subjectId: "post-1", subjectBrandId: "b-1" })).toBe("/marketing/b-1/socials/post/post-1");
  });
  it("without a recorded subject it falls back to the list, and says so", () => {
    expect(chargeLink(base)).toEqual({ href: "/marketing/social", label: "All social", hint: expect.any(String) });
    expect(chargeLink({ ...base, subjectKind: "account", subjectPlatform: "tiktok", subjectId: "p-1", subjectBrandId: null })?.label).toBe("All social");
  });
});
