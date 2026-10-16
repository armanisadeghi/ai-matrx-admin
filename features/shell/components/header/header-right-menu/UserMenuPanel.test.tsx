/**
 * 🚨 DARK MODE IS NEVER FILED UNDER ADMIN.
 *
 * cold-walk-13 friction (common-docs/systems/masterwork/STATE.md/
 * jobs-bar-2026-09-16/cold-walk-13/README.md): "Dark Mode still sits under a
 * menu section headed ADMIN" — a person-level preference living inside the
 * admin-only accordion tells every non-admin (and every admin reading it)
 * that theme is an admin capability, and buries it behind a group most
 * people have no reason to open.
 *
 * Since 2026-09-30 the theme switch lives in the account rail's Settings
 * slot (`ShellSettingsMenu`). Source-text forcing function: it fails the
 * moment the switch moves back into the avatar menu or behind an admin gate.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const SOURCE_PATH = path.join(__dirname, "UserMenuPanel.tsx");

function readSource(): string {
  return readFileSync(SOURCE_PATH, "utf8");
}

/** Slices out the `<MenuGroup id="admin" ...>...</MenuGroup>` block. */
function adminGroupBlock(_panelSource: string): string {
  // The group lives behind the admin gate's dynamic edge (AdminMenuGroupImpl).
  const source = readFileSync(path.join(__dirname, "AdminMenuGroupImpl.tsx"), "utf8");
  const start = source.indexOf('id="admin"');
  expect(start).toBeGreaterThan(-1);
  const openTagStart = source.lastIndexOf("<MenuGroup", start);
  const end = source.indexOf("</MenuGroup>", start);
  expect(end).toBeGreaterThan(-1);
  return source.slice(openTagStart, end + "</MenuGroup>".length);
}

describe("Dark mode is a person-level setting — the rail's Settings slot, never ADMIN", () => {
  // Owner, 2026-09-30: light/dark, Media and Preferences moved out of the
  // avatar menu into the account rail's Settings slot (ShellSettingsMenu).
  it("lives in the Settings menu, which no admin gate wraps", () => {
    const settings = readFileSync(
      path.join(__dirname, "..", "..", "account-rail", "ShellSettingsMenu.tsx"),
      "utf8",
    );
    // Light | Dark | Device — "Device" (system) is the default (2026-10-01).
    expect(settings).toContain("dispatch(setMode(choice))");
    expect(settings).toMatch(/mode: "system", label: "Device"/);
    expect(settings).not.toMatch(/selectIsSuperAdmin|isAdmin/);
  });

  it("is not in the avatar menu at all, admin group included", () => {
    const source = readSource();
    expect(source).not.toContain("ThemeToggleMenuItem");
    expect(adminGroupBlock(source)).not.toContain("setMode");
  });
});

describe("UserMenuPanel — Intelligence is a person-level destination", () => {
  it("links /intelligence outside the admin group", () => {
    const source = readSource();
    const anchor = source.indexOf('href="/intelligence"');
    expect(anchor).toBeGreaterThan(-1);
    expect(adminGroupBlock(source)).not.toContain('href="/intelligence"');
  });
});

describe("UserMenuPanel — the admin group never shifts the menu (no layout shift)", () => {
  it("reserves the group's row while its chunk loads, from the same row primitive", () => {
    const source = readSource();
    expect(source).toMatch(/loading: \(\) => \(/);
    expect(source).toContain("MenuGroupSkeleton");
    const group = readFileSync(path.join(__dirname, "MenuGroup.tsx"), "utf8");
    expect(group).toContain("MENU_GROUP_ROW_CLASS");
    // the real label and the skeleton share the one row class
    expect(group.match(/MENU_GROUP_ROW_CLASS/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it("starts the chunk on trigger hover/focus/press, with no static admin import", () => {
    const source = readSource();
    expect(source).toMatch(/"pointerenter"/);
    expect(source).toMatch(/"focus"/);
    expect(source).not.toMatch(/^import .*AdminMenuGroupImpl/m);
  });
});
