import { applyPublicUrls, publicTargetId } from "../public-url";
import { publicPathFor, type ResolvedDomain } from "../host-routing";

const form = "6eb05c97-547d-4092-bbde-f87ce43492e7";
const booking = "c605f46f-b996-43e5-8767-503a0283932d";
const org = "0a54df90-eab8-4d07-ab29-81a45fb41e04";

describe("publicTargetId", () => {
  it("reads the target of a form, booking page or portal link", () => {
    expect(publicTargetId(`/f/${form}`)).toBe(form);
    expect(publicTargetId(`/b/${booking}`)).toBe(booking);
    expect(publicTargetId(`/portal/${org}`)).toBe(org);
  });
  it("ignores anything else", () => {
    expect(publicTargetId(`/files/f/${form}`)).toBeNull();
    expect(publicTargetId(`/data/${form}`)).toBeNull();
    expect(publicTargetId(null)).toBeNull();
  });
});

describe("applyPublicUrls", () => {
  it("uses the live custom domain when one maps the thing, and leaves the rest", () => {
    const rows = [
      { id: 1, publicHref: `/f/${form}` },
      { id: 2, publicHref: `/b/${booking}` },
      { id: 3, publicHref: null },
    ];
    expect(applyPublicUrls(rows, { [form]: "https://book.cedarridgept.com/intake" })).toEqual([
      { id: 1, publicHref: "https://book.cedarridgept.com/intake" },
      { id: 2, publicHref: `/b/${booking}` },
      { id: 3, publicHref: null },
    ]);
  });
});

describe("publicPathFor", () => {
  const domain: ResolvedDomain = {
    organization_id: org,
    routes: [
      { path_prefix: "/", target_kind: "booking", target_id: booking },
      { path_prefix: "/intake", target_kind: "form", target_id: form },
      { path_prefix: "/portal", target_kind: "portal", target_id: org },
    ],
  };
  it("answers the path this host shows a target at", () => {
    expect(publicPathFor(`/b/${booking}`, domain)).toBe("/");
    expect(publicPathFor(`/f/${form}`, domain)).toBe("/intake");
    expect(publicPathFor(`/portal/${org}`, domain)).toBe("/portal");
  });
  it("answers null for a target the host does not map", () => {
    expect(publicPathFor("/f/00000000-0000-0000-0000-000000000000", domain)).toBeNull();
  });
});
