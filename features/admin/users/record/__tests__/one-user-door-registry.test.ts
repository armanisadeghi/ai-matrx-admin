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
 * ONE DISPATCH (lane P, 2026-10-18, adversarial S2): the actions on a person run through
 * `useUserActions().run(id, person)` only. A second `switch` over action ids anywhere in the users
 * admin tree (the record page and the roster each had one, with diverging rules) fails here.
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

// ── one dispatch ───────────────────────────────────────────────────────────────────────────

// The dispatch itself, and the registry's own label / "can't now" rules.
const DISPATCH_FILES = ["features/admin/users/record/useUserActions.tsx", "features/admin/users/record/userSurfaces.ts"];
const DISPATCH_ROOTS = ["features/admin/users", "app/(admin)/administration/users"];

function actionIds(): string[] {
  const registry = fs.readFileSync(path.join(ROOT, "features/admin/users/record/userSurfaces.ts"), "utf8");
  const union = registry.match(/export type UserActionId =([\s\S]*?);/);
  return union ? [...union[1].matchAll(/"([a-z_]+)"/g)].map((m) => m[1] ?? "") : [];
}

/** True when the source switches on registered action ids itself (3+ `case "<action id>":`). */
export function dispatchesActions(source: string, ids: readonly string[]): boolean {
  const code = stripComments(source);
  const cases = [...code.matchAll(/case\s+"([a-z_]+)"\s*:/g)].filter((m) => ids.includes(m[1] ?? ""));
  return new Set(cases.map((m) => m[1])).size >= 3;
}

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(rel);
    return /\.(ts|tsx)$/.test(entry.name) ? [rel] : [];
  });
}

describe("one user-action dispatch", () => {
  const ids = actionIds();

  it("reads the registered action ids", () => {
    expect(ids).toEqual(expect.arrayContaining(["close", "reopen", "change_plan", "support_session"]));
  });

  it("the detector catches a second switch and passes a caller of run()", () => {
    const secondSwitch = `
      const runAction = (id, row) => { switch (id) {
        case "support_session": open(row); return;
        case "close": close(row); return;
        case "reopen": reopen(row); return;
      } };`;
    expect(dispatchesActions(secondSwitch, ids)).toBe(true);
    const caller = `
      // case "close": the old switch is gone
      actions.run(def.id, row);`;
    expect(dispatchesActions(caller, ids)).toBe(false);
  });

  it("no file but useUserActions switches on action ids", () => {
    const offenders = DISPATCH_ROOTS.flatMap(sourceFiles)
      .filter((file) => !DISPATCH_FILES.includes(file))
      .filter((file) => dispatchesActions(fs.readFileSync(path.join(ROOT, file), "utf8"), ids));
    expect(offenders).toEqual([]);
  });
});

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
