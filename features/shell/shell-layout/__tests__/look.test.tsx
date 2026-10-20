/**
 * THE LOOK (custom-experience amendment 2026-10-20) — the visual half of a Layout. The promises:
 *   - `look` is validated like every region: a known id is kept, anything else is dropped and NAMED;
 *   - it resolves like every region (the winning body's, person > organization > none; Standard view
 *     and guests → none), and the server's light pick always agrees with the full resolver;
 *   - nothing chosen = NO attribute and NO change to a row's HTML (an uncustomized boot is byte-identical);
 *   - the Meet Matrx launchpad template is built only from registered widgets.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type StoredShellLayout } from "../contract";
import { parseShellLayoutBody, serializeShellLayoutBody, validateShellLayoutBody } from "../validate";
import { resolveShellLayout } from "../resolve";
import { heldShellLook, resolveHeldShellLayout, type HeldShellLayouts } from "../held";
import { seedShellLayoutState } from "../shellLayoutSlice";
import { SHELL_LOOKS, shellLookAttributes, shellLookHue, shellLookRowProps, SHELL_LOOK_DOMAIN_HUES } from "../looks";
import { lookOf, withLook } from "../editor/regions";
import { primaryNavItems } from "../../constants/nav-data";
import { launchpadTemplate } from "@/features/launchpad/templates";
import { getLaunchpadWidgetSpec } from "@/features/launchpad/widgets/catalog";

jest.mock("@/components/navigation/AppLink", () => ({
  __esModule: true,
  default: ({ prefetch: _p, ...props }: Record<string, unknown>) => <a {...props} />,
}));
jest.mock("@ai-matrx/kit/outbound-react", () => ({ OutboundLink: (props: Record<string, unknown>) => <a {...props} /> }));
// eslint-disable-next-line import/first -- the mocks above must register before NavItem loads
import NavItem from "../../components/sidebar/NavItem";

const ORG = "00000000-0000-4000-8000-00000000000a";
const body = (extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody => ({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1, ...extra });
const stored = (b: ShellLayoutBody, recordId = "r1"): StoredShellLayout => ({ recordId, organizationId: ORG, version: 1, updatedAt: "2026-10-20T00:00:00Z", body: serializeShellLayoutBody(b) });

describe("validate: look", () => {
  it("keeps a registered look and round-trips it", () => {
    const parsed = validateShellLayoutBody({ ...body(), look: { id: "meet-matrx" } });
    expect(parsed.problems).toEqual([]);
    expect(parsed.body?.look).toEqual({ id: "meet-matrx" });
    expect(parseShellLayoutBody(serializeShellLayoutBody(parsed.body!)).body).toEqual(parsed.body);
  });
  it.each([[{ id: "neon" }], ["meet-matrx"], [{}], [null]])("drops %j and names it", (look) => {
    const parsed = validateShellLayoutBody({ ...body(), look });
    expect(parsed.body?.look).toBeUndefined();
    expect(parsed.problems).toEqual([expect.stringMatching(/^look: unknown look .*; the standard look is used$/)]);
  });
  it("a body with no look serializes with no look key (what you see is what is stored)", () => {
    expect(serializeShellLayoutBody(body())).not.toContain("look");
  });
});

describe("resolve: look", () => {
  const base = { standardView: false, isAdmin: false, isGuest: false };
  it("is none by default, and none for `standard`", () => {
    expect(resolveShellLayout({ ...base, person: null, organization: null }).look).toBeNull();
    expect(resolveShellLayout({ ...base, person: body({ look: { id: "standard" } }), organization: null }).look).toBeNull();
  });
  it("is the winning body's: the person's, else the organization's; the person's body wins whole", () => {
    expect(resolveShellLayout({ ...base, person: body({ look: { id: "meet-matrx" } }), organization: null }).look).toBe("meet-matrx");
    expect(resolveShellLayout({ ...base, person: null, organization: body({ look: { id: "meet-matrx" } }) }).look).toBe("meet-matrx");
    expect(resolveShellLayout({ ...base, person: body(), organization: body({ look: { id: "meet-matrx" } }) }).look).toBeNull();
  });
  it("Standard view and guests see none", () => {
    const person = body({ look: { id: "meet-matrx" } });
    expect(resolveShellLayout({ ...base, person, organization: null, standardView: true }).look).toBeNull();
    expect(resolveShellLayout({ ...base, person, organization: null, isGuest: true }).look).toBeNull();
  });
  it("a look-only body leaves every other region the built-in default (the same arrays)", () => {
    const resolved = resolveShellLayout({ ...base, person: body({ look: { id: "meet-matrx" } }), organization: null });
    expect(resolved.sidebar).toBe(primaryNavItems);
    expect(resolved.problems).toEqual([]);
  });
});

describe("the server's light pick agrees with the full resolver", () => {
  const meet = stored(body({ look: { id: "meet-matrx" } }));
  const plain = stored(body(), "r2");
  const cases: Array<[string, Partial<HeldShellLayouts>]> = [
    ["nothing stored", {}],
    ["person look", { person: meet }],
    ["person plain over org look", { person: plain, organizations: { [ORG]: meet }, organizationId: ORG }],
    ["org look only", { organizations: { [ORG]: meet }, organizationId: ORG }],
    ["org look, other org applies", { organizations: { [ORG]: meet }, organizationId: "x" }],
    ["locked: org plain beats person look", { person: meet, organizations: { [ORG]: plain }, organizationId: ORG, personAllowed: false }],
    ["standard view", { person: meet, standardView: true }],
    ["preview names the look", { person: plain, previewBody: serializeShellLayoutBody(body({ look: { id: "meet-matrx" } })) }],
    ["unreadable person body falls to the org", { person: { ...plain, body: "{" }, organizations: { [ORG]: meet }, organizationId: ORG }],
    ["not (core)", { enabled: false, person: meet }],
  ];
  it.each(cases)("%s", (_name, over) => {
    const held: HeldShellLayouts = { enabled: true, person: null, organizations: {}, organizationId: null, standardView: false, ...over };
    for (const isGuest of [false, true]) {
      expect(heldShellLook(held, { isGuest })).toBe(resolveHeldShellLayout(held, { isAdmin: false, isGuest }).look);
    }
  });
});

describe("the stamp: present only when a look is chosen", () => {
  it("an uncustomized boot stamps nothing", () => {
    const state = seedShellLayoutState({ seed: null, seedLanded: true, organizationId: null, standardView: false, reserved: false });
    expect(shellLookAttributes(heldShellLook(state, { isGuest: false }))).toEqual({});
    expect(shellLookAttributes("standard")).toEqual({});
  });
  it("a meet-matrx boot stamps the attribute on the first frame", () => {
    const state = seedShellLayoutState({ seed: { person: stored(body({ look: { id: "meet-matrx" } })), organizations: {} }, seedLanded: true, organizationId: ORG, standardView: false, reserved: false });
    expect(shellLookAttributes(heldShellLook(state, { isGuest: false }))).toEqual({ "data-shell-look": "meet-matrx" });
  });
  it("AppShell spreads the stamp on .shell-root, computed from the seeded slice", () => {
    const src = readFileSync(join(__dirname, "../../components/AppShell.tsx"), "utf8");
    expect(src).toMatch(/className="shell-root"\s+data-pathname=\{pathname\}\s+\{\.\.\.shellLookAttributes\(shellLook\)\}/);
    expect(src).toContain("heldShellLook(initialReduxState.shellLayout");
  });
});

describe("rows under a look", () => {
  const agents = primaryNavItems.find((i) => i.id === "agents")!;
  it("an uncustomized row's HTML is unchanged", () => {
    expect(shellLookRowProps(null, agents)).toEqual({ row: {}, tile: {} });
    expect(renderToStaticMarkup(<NavItem item={agents} look={null} />)).toBe(renderToStaticMarkup(<NavItem item={agents} />));
    expect(renderToStaticMarkup(<NavItem item={agents} />)).not.toContain("look");
  });
  it("a meet-matrx row wears its domain's tile", () => {
    const html = renderToStaticMarkup(<NavItem item={agents} look="meet-matrx" />);
    expect(html).toContain('data-look-row="meet-matrx"');
    expect(html).toContain('data-look-tile="meet-matrx"');
    expect(html).toContain("--look-hue:#1E40AF");
  });
  it("every top-level domain has its own tile color", () => {
    const missing = primaryNavItems.filter((item) => !/^#[0-9A-F]{6}$/i.test(SHELL_LOOK_DOMAIN_HUES[item.id] ?? "")).map((i) => i.id);
    expect(missing).toEqual([]);
    expect(shellLookHue({ id: "my-own-link" })).toBe(shellLookHue({ id: "my-own-link" }));
  });
});

describe("editor helpers", () => {
  it("withLook writes the look and standard removes it", () => {
    expect(withLook(body(), "meet-matrx").look).toEqual({ id: "meet-matrx" });
    expect("look" in withLook(body({ look: { id: "meet-matrx" } }), "standard")).toBe(false);
    expect(lookOf(null)).toBe("standard");
    expect(SHELL_LOOKS.map((l) => l.id)).toEqual(["standard", "meet-matrx"]);
  });
});

describe("the Meet Matrx launchpad template", () => {
  it("is built only from registered widgets, studios first", () => {
    const doc = launchpadTemplate("meet-matrx")!.doc();
    expect(doc.widgets.map((w) => w.type)).toEqual(["meet_matrx", "meet_matrx", "agents", "recent", "favorites"]);
    for (const w of doc.widgets) expect(getLaunchpadWidgetSpec(w.type)).toBeDefined();
    expect(doc.widgets[0]!.config).toEqual({ part: "studios" });
  });
});
