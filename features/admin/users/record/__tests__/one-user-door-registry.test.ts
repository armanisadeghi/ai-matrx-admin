/**
 * GUARD (users one-roof lane C, plan attack F8): a person's admin doors are declared ONCE, in
 * record/userSurfaces.ts (`userDoors`, `USER_TABS`, `USER_ACTIONS`). The three menus that used to
 * hand-copy the list — the name chip (AdminUserRef), the right-click section
 * (admin-user-menu-section) and the roster's Manage menu (AccountsTableClient) — must import the
 * registry and declare no door of their own.
 *
 * A "door of their own" is a literal per-person admin address: `/administration/users?user=`,
 * `/administration/users/<hub>?user=` / `?userId=`, or a direct `usagePersonHref(` call.
 *
 * DOOR_GUARD_ROOT points the guard at another tree (the red half: the pre-registry files).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.DOOR_GUARD_ROOT ?? path.resolve(__dirname, "../../../../..");

export const MENU_FILES = [
  "features/admin/users/components/AdminUserRef.tsx",
  "features/admin/users/components/admin-user-menu-section.tsx",
  "features/admin/users/components/AccountsTableClient.tsx",
] as const;

const LITERAL_DOOR = /\/administration\/users(?:\/[a-z-]+)?\?user(?:Id)?=|usagePersonHref\(/;
const IMPORTS_REGISTRY = /from\s+["'](?:\.\.\/record\/userSurfaces|@\/features\/admin\/users\/record\/userSurfaces)["']/;
const USES_DOORS = /\buserDoors\(/;

/** Code without comments (a comment naming an old address is not a door). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

/** Why one menu file breaks the rule; empty when it reads the registry and declares no door. */
export function problemsIn(source: string): string[] {
  const code = stripComments(source);
  const problems: string[] = [];
  const literal = code.match(LITERAL_DOOR);
  if (literal) problems.push(`declares its own door (${literal[0]})`);
  if (!IMPORTS_REGISTRY.test(code)) problems.push("does not import record/userSurfaces");
  if (!USES_DOORS.test(code)) problems.push("does not render userDoors()");
  return problems;
}

describe("one user-door registry", () => {
  it("the detector catches a hand-copied door list and passes a registry reader", () => {
    const handCopied = `
      import { usagePersonHref } from "@/features/admin/usage-drill/usageLinks";
      const doors = [{ href: \`/administration/users/organizations?user=\${id}\` }, { href: usagePersonHref(id) }];`;
    expect(problemsIn(handCopied).length).toBeGreaterThan(0);
    const reader = `
      import { userDoors } from "../record/userSurfaces";
      // the old /administration/users?user= address is gone
      const doors = userDoors(id);`;
    expect(problemsIn(reader)).toEqual([]);
  });

  it.each(MENU_FILES)("%s reads the registry and declares no door", (file) => {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    expect(problemsIn(source)).toEqual([]);
  });
});
