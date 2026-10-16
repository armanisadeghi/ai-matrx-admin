/**
 * The sidebar's admin-footer flag is set by the thin gate the moment the admin
 * boolean is known, never by the lazily loaded block: the domain panel's width
 * must not jump when the chunk arrives.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

const read = (f: string) => readFileSync(path.join(__dirname, f), "utf8");

describe("admin footer flag", () => {
  it("is set in the gate, keyed on the admin boolean", () => {
    const gate = read("AdminSidebarSection.tsx");
    expect(gate).toContain("ADMIN_FOOTER_ATTR");
    expect(gate).toMatch(/setAttribute\(ADMIN_FOOTER_ATTR/);
    expect(gate).toMatch(/\[isAdmin\]/);
  });

  it("is not set by the lazily loaded block", () => {
    const impl = read("AdminSidebarSectionImpl.tsx");
    expect(impl).not.toContain("data-admin-footer");
    expect(impl).not.toContain("ADMIN_FOOTER_ATTR");
  });
});
