/**
 * A screen that labels a record's organization must find it when it is beyond her first page
 * (bounded organizations, 2026-10-17). `mergeNamedOrganizations` is the hook's pure core: the page
 * plus the named ids that the by-id lookup knows are hers — never her whole list.
 */
import { mergeNamedOrganizations } from "@/features/organizations/hooks/useOrganizationsWith";
import type { OrganizationWithRole } from "@/features/organizations/types";

const o = (id: string) => ({ id, name: `Org ${id}`, role: "member" }) as unknown as OrganizationWithRole;

describe("mergeNamedOrganizations", () => {
  const page = [o("a"), o("b")];

  it("adds a named organization that is not on her page but is hers", () => {
    const out = mergeNamedOrganizations(page, ["z"], (id) => (id === "z" ? o("z") : undefined));
    expect(out.map((x) => x.id)).toEqual(["a", "b", "z"]);
  });

  it("does not add an organization she is not in (null) or one not yet answered (undefined)", () => {
    const out = mergeNamedOrganizations(page, ["x", "y"], (id) => (id === "x" ? null : undefined));
    expect(out).toBe(page);
  });

  it("does not duplicate an id already on the page", () => {
    const out = mergeNamedOrganizations(page, ["a"], () => o("a"));
    expect(out).toBe(page);
  });
});
