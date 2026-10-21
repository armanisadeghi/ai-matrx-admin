// CD-PAY-11: a published Spaces page can be served on the business's own domain. A route of kind
// "space" rewrites to the public page /site/<id> (content.space_public_view — on the web or nothing),
// and its sub-page links (/site/<slug>) are served as-is on that host; a host that maps no space page
// keeps /site/* a 404.

import {
  internalPathFor,
  passthroughOnCustomHost,
  publicPathFor,
  type ResolvedDomain,
} from "../host-routing";

const org = "0d1f5f0e-8f43-4a1e-9b5d-3f0a6c2f9e11";
const page = "9a4c0d8e-2b7f-4c61-8e3d-5f6a7b8c9d01";
const withSpace: ResolvedDomain = {
  organization_id: org,
  routes: [
    { path_prefix: "/", target_kind: "space", target_id: page },
    { path_prefix: "/intake", target_kind: "form", target_id: "6eb05c97-547d-4092-bbde-f87ce43492e7" },
  ],
};
const formsOnly: ResolvedDomain = { organization_id: org, routes: [withSpace.routes[1]] };

describe("a custom domain shows a published Space page", () => {
  it("rewrites the mapped path to the public page", () => {
    expect(internalPathFor("/", withSpace)).toBe(`/site/${page}`);
    const docs: ResolvedDomain = { organization_id: org, routes: [{ path_prefix: "/docs", target_kind: "space", target_id: page }] };
    expect(internalPathFor("/docs", docs)).toBe(`/site/${page}`);
  });

  it("serves its sub-page links on the host only when a space page is mapped", () => {
    expect(passthroughOnCustomHost("/site/team-handbook", withSpace)).toBe(true);
    expect(passthroughOnCustomHost("/site/team-handbook", formsOnly)).toBe(false);
    expect(passthroughOnCustomHost("/site", withSpace)).toBe(false);
  });

  it("builds the link a visitor follows back on this host", () => {
    expect(publicPathFor(`/site/${page}`, withSpace)).toBe("/");
  });
});
