/**
 * The file details Share tab names its Owner (a person, never "87a6e699").
 * Behaviour of the resolver, plus a source contract that the tab uses it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveOwnerLabel, UNKNOWN_PERSON_LABEL } from "../useOwnerLabel";

const OWNER = "87a6e699-3622-4869-8843-d0867456c0dd";

describe("resolveOwnerLabel", () => {
  it("names the signed-in owner from their own profile", () => {
    expect(
      resolveOwnerLabel({ ownerId: OWNER, currentUserId: OWNER, self: { fullName: "Admin Person", email: "a@b.c" }, people: [] }),
    ).toEqual({ label: "Admin Person", resolved: true });
  });
  it("falls back to the email, then to the roster for someone else", () => {
    expect(resolveOwnerLabel({ ownerId: OWNER, currentUserId: OWNER, self: { email: "admin@admin.com" }, people: [] }).label).toBe("admin@admin.com");
    expect(
      resolveOwnerLabel({ ownerId: OWNER, currentUserId: "other", self: { fullName: "Not Them" }, people: [{ user_id: OWNER, display_name: "Pat Roe", email: null }] }),
    ).toEqual({ label: "Pat Roe", resolved: true });
  });
  it("never answers with an id fragment: nobody found says Unknown person", () => {
    const r = resolveOwnerLabel({ ownerId: OWNER, currentUserId: "other", self: {}, people: [] });
    expect(r).toEqual({ label: UNKNOWN_PERSON_LABEL, resolved: false });
    expect(r.label).not.toContain(OWNER.slice(0, 8));
  });
});

describe("FileShareTab Owner row", () => {
  const src = readFileSync(join(__dirname, "../../components/surfaces/FileShareTab.tsx"), "utf8");
  it("resolves the owner's name and does not show the bare id as the value", () => {
    expect(src).toContain("useOwnerLabel(");
    expect(src).toContain("{owner.label}");
    expect(src).not.toMatch(/<RecordId value=\{file\.ownerId\} label="Owner" \/>\s*\{isOwner/);
  });
});
