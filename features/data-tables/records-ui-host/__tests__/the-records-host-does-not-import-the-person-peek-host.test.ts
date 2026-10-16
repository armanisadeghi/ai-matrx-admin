/**
 * The records host reaches the person peek through the small store only, so PersonPeekHost
 * (peek dialogs, supabase) stays behind its overlay-world edge and out of the boot bundle.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "..", "recordsUiHost.tsx"), "utf8");

describe("recordsUiHost person peek import", () => {
  it("imports openPersonPeek from the store, never from the host", () => {
    expect(source).not.toMatch(/from\s+["']\.\/PersonPeekHost["']/);
    expect(source).toMatch(/openPersonPeek[^;]*from\s+["']\.\/personPeekStore["']/);
  });
});
