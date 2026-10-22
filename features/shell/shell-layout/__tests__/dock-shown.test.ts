/**
 * THE DOCK IS SHOWN ONLY WHEN IT WAS CUSTOMIZED (audit 2026-10-22 #2). The phone dock is hidden on every
 * route by default (styles/shell.css §13: `.shell-root:not([data-show-dock]) ~ * .shell-dock`). Before,
 * "Customize dock…" edited a region nobody could ever see. Now a layout that carries its own Dock stamps
 * `data-show-dock` (server first frame + ShellLayoutSync after a save); everyone else's phone is unchanged.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type StoredShellLayout } from "../contract";
import { serializeShellLayoutBody } from "../validate";
import { resolveShellLayout } from "../resolve";
import { heldShellShowsDock, resolveHeldShellLayout, type HeldShellLayouts } from "../held";
import { defaultDockTree, SHELL_CATALOG_VERSION } from "../catalog";

const ORG = "00000000-0000-4000-8000-00000000000a";
const body = (extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody => ({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: SHELL_CATALOG_VERSION, ...extra });
const stored = (b: ShellLayoutBody): StoredShellLayout => ({ recordId: "r1", organizationId: ORG, version: 1, updatedAt: "2026-10-22T00:00:00Z", body: serializeShellLayoutBody(b) });
const held = (h: Partial<HeldShellLayouts>): HeldShellLayouts => ({ enabled: true, person: null, organizations: {}, organizationId: ORG, standardView: false, ...h });
const viewer = { isAdmin: false, isGuest: false };

describe("which layouts show the phone dock", () => {
  const cases: Array<[string, HeldShellLayouts, boolean]> = [
    ["nothing saved", held({}), false],
    ["a person's layout without a Dock", held({ person: stored(body({ sidebar: [] })) }), false],
    ["a person's layout with a Dock", held({ person: stored(body({ dock: defaultDockTree() })) }), true],
    ["the organization's layout with a Dock", held({ organizations: { [ORG]: stored(body({ dock: defaultDockTree() })) } }), true],
    ["Standard view over a customized Dock", held({ standardView: true, person: stored(body({ dock: defaultDockTree() })) }), false],
    ["the editor's preview of a Dock", held({ previewBody: serializeShellLayoutBody(body({ dock: defaultDockTree() })) }), true],
    ["a person locked out, organization without a Dock", held({ personAllowed: false, person: stored(body({ dock: defaultDockTree() })), organizations: { [ORG]: stored(body({ sidebar: [] })) } }), false],
  ];
  it.each(cases)("%s", (_name, h, shown) => {
    expect(resolveHeldShellLayout(h, viewer).customDock).toBe(shown);
    // The server's light pick (AppShell) always agrees with the full resolver (ShellLayoutSync).
    expect(heldShellShowsDock(h, viewer)).toBe(shown);
  });
  it("guests never get it", () => {
    expect(resolveShellLayout({ person: body({ dock: defaultDockTree() }), organization: null, standardView: false, isAdmin: false, isGuest: true }).customDock).toBe(false);
    expect(heldShellShowsDock(held({ person: stored(body({ dock: defaultDockTree() })) }), { isGuest: true })).toBe(false);
  });
});

describe("the stamp is wired on both halves", () => {
  const root = join(__dirname, "../../../..");
  it("AppShell stamps data-show-dock from the held layout (first frame)", () => {
    const src = readFileSync(join(root, "features/shell/components/AppShell.tsx"), "utf8");
    expect(src).toMatch(/heldShellShowsDock\(/);
    expect(src).toMatch(/"data-show-dock"/);
  });
  it("ShellLayoutSync follows a save / preview in place", () => {
    const src = readFileSync(join(root, "features/shell/shell-layout/ShellLayoutSync.tsx"), "utf8");
    expect(src).toMatch(/selectShellCustomDock/);
    expect(src).toMatch(/dataset\.showDock/);
  });
  it("the CSS hides the dock only where the attribute is absent", () => {
    const css = readFileSync(join(root, "styles/shell.css"), "utf8");
    expect(css).toContain(".shell-root:not([data-show-dock]) ~ * .shell-dock");
  });
});
