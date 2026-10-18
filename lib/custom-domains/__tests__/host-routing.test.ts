import { apiAllowedOnCustomHost, hostClass, internalPathFor, passthroughOnCustomHost, type ResolvedDomain } from "../host-routing";

const own = ["www.aimatrx.com", "manage.aimatrx.com", null];
const org = "0a54df90-eab8-4d07-ab29-81a45fb41e04";
const domain: ResolvedDomain = {
  organization_id: org,
  routes: [
    { path_prefix: "/", target_kind: "booking", target_id: "c605f46f-b996-43e5-8767-503a0283932d" },
    { path_prefix: "/intake", target_kind: "form", target_id: "6eb05c97-547d-4092-bbde-f87ce43492e7" },
    { path_prefix: "/portal", target_kind: "portal", target_id: org },
  ],
};

describe("hostClass", () => {
  it("leaves our own hosts untouched", () => {
    expect(hostClass("www.aimatrx.com", own)).toBe("platform");
    expect(hostClass("aimatrx.com", own)).toBe("platform");
    expect(hostClass("learn.aimatrx.com", own)).toBe("platform");
    expect(hostClass("ai-matrx-git-main.vercel.app", own)).toBe("platform");
    expect(hostClass("localhost:3001", own)).toBe("platform");
    expect(hostClass("127.0.0.1:3001", own)).toBe("platform");
    expect(hostClass(null, own)).toBe("platform");
  });
  it("treats preview *.localhost hosts as dev (lookup, app on miss)", () => {
    expect(hostClass("s6f322d80.localhost:3001", own)).toBe("dev");
  });
  it("treats every other host as a customer host", () => {
    expect(hostClass("book.cedarridgept.com", own)).toBe("custom");
    expect(hostClass("evil-aimatrx.com", own)).toBe("custom");
  });
});

describe("internalPathFor", () => {
  it("maps the root to the root target", () => {
    expect(internalPathFor("/", domain)).toBe("/b/c605f46f-b996-43e5-8767-503a0283932d");
  });
  it("maps a prefix and keeps what follows it", () => {
    expect(internalPathFor("/intake", domain)).toBe("/f/6eb05c97-547d-4092-bbde-f87ce43492e7");
    expect(internalPathFor("/intake/", domain)).toBe("/f/6eb05c97-547d-4092-bbde-f87ce43492e7");
    expect(internalPathFor("/portal/records", domain)).toBe(`/portal/${org}/records`);
  });
  it("answers null (404) for paths outside the mapping and for the app", () => {
    expect(internalPathFor("/administration", domain)).toBeNull();
    expect(internalPathFor("/login", domain)).toBeNull();
    expect(internalPathFor("/f/someone-elses-form", domain)).toBeNull();
    expect(internalPathFor("/intakeX", domain)).toBeNull();
  });
  it("answers null for every path when nothing is mapped", () => {
    expect(internalPathFor("/", { organization_id: org, routes: [] })).toBeNull();
  });
});

describe("apiAllowedOnCustomHost", () => {
  it("lets through the endpoints the published pages call", () => {
    expect(apiAllowedOnCustomHost("/api/forms/6eb05c97-547d-4092-bbde-f87ce43492e7/submit")).toBe(true);
    expect(apiAllowedOnCustomHost("/api/bookings/c605f46f-b996-43e5-8767-503a0283932d/hold")).toBe(true);
    expect(apiAllowedOnCustomHost("/api/bookings/manage/ABC123")).toBe(true);
    expect(apiAllowedOnCustomHost("/api/portal/cedar/sign-in")).toBe(true);
    expect(apiAllowedOnCustomHost("/api/payments/return")).toBe(true);
    expect(apiAllowedOnCustomHost("/api/diagnostics/client-error")).toBe(true);
  });
  it("refuses the rest of the app's API", () => {
    expect(apiAllowedOnCustomHost("/api/admin/surfaces/sync-manifests")).toBe(false);
    expect(apiAllowedOnCustomHost("/api/payments/connect")).toBe(false);
    expect(apiAllowedOnCustomHost("/api/organizations/x/domains")).toBe(false);
    expect(apiAllowedOnCustomHost("/api/user/profile")).toBe(false);
    expect(apiAllowedOnCustomHost("/api/formsX")).toBe(false);
  });
});

describe("passthroughOnCustomHost", () => {
  it("serves sign-in when a portal is mapped and booking management when a booking page is", () => {
    expect(passthroughOnCustomHost("/login", domain)).toBe(true);
    expect(passthroughOnCustomHost("/forgot-password", domain)).toBe(true);
    expect(passthroughOnCustomHost("/b/manage/ABC123", domain)).toBe(true);
  });
  it("serves neither when the matching kind is not mapped", () => {
    const formsOnly: ResolvedDomain = { organization_id: org, routes: [domain.routes[1]] };
    expect(passthroughOnCustomHost("/login", formsOnly)).toBe(false);
    expect(passthroughOnCustomHost("/b/manage/ABC123", formsOnly)).toBe(false);
    expect(passthroughOnCustomHost("/administration", domain)).toBe(false);
    expect(passthroughOnCustomHost("/b/other", domain)).toBe(false);
  });
});
