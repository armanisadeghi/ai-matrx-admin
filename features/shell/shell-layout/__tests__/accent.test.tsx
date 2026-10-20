/**
 * THE ACCENT (custom-experience P4, amendment 2026-10-20 lane Q) — a person's accent color and an
 * organization's brand color. The promises:
 *   - `accent` is validated like every region: a curated id or a hex (stored normalized) is kept,
 *     anything else is dropped and NAMED;
 *   - it resolves PER FIELD: the person's accent, else the organization's brand color, else none;
 *     the lock (personAllowed false) leaves only the organization's; Standard view and guests: none;
 *   - the server's light pick always agrees with the full resolver;
 *   - the first frame carries the design system's stamp (attribute + both themes' tokens) only when an
 *     accent is chosen — an uncustomized boot is byte-identical;
 *   - an editor never copies the organization's brand color into a person's own layout;
 *   - the client keeps `.shell-root` and <html> in step, touching only the accent's own stamp.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACCENT_PROPERTIES, accentAttributes } from "@ai-matrx/design-system/accents";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type StoredShellLayout } from "../contract";
import { parseShellLayoutBody, serializeShellLayoutBody, validateShellLayoutBody } from "../validate";
import { resolveShellLayout } from "../resolve";
import { heldShellAccent, resolveHeldShellLayout, type HeldShellLayouts } from "../held";
import { seedShellLayoutState } from "../shellLayoutSlice";
import { accentOf, startingBody, withAccent } from "../editor/regions";
import { applyShellAccent } from "../ShellLayoutSync";

const ORG = "00000000-0000-4000-8000-00000000000a";
const body = (extra: Partial<ShellLayoutBody> = {}): ShellLayoutBody => ({ schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1, ...extra });
const stored = (b: ShellLayoutBody, recordId = "r1"): StoredShellLayout => ({ recordId, organizationId: ORG, version: 1, updatedAt: "2026-10-20T00:00:00Z", body: serializeShellLayoutBody(b) });

describe("validate: accent", () => {
  it("keeps a curated id and round-trips it", () => {
    const parsed = validateShellLayoutBody({ ...body(), accent: { id: "violet" } });
    expect(parsed.problems).toEqual([]);
    expect(parsed.body?.accent).toEqual({ id: "violet" });
    expect(parseShellLayoutBody(serializeShellLayoutBody(parsed.body!)).body).toEqual(parsed.body);
  });
  it("keeps a custom hex, stored normalized", () => {
    const parsed = validateShellLayoutBody({ ...body(), accent: { hex: "#ABC" } });
    expect(parsed.problems).toEqual([]);
    expect(parsed.body?.accent).toEqual({ hex: "#aabbcc" });
    expect(serializeShellLayoutBody(parsed.body!)).toContain('"accent":{"hex":"#aabbcc"}');
  });
  it("keeps a low-contrast hex too (the editor warns; validation never refuses a color)", () => {
    expect(validateShellLayoutBody({ ...body(), accent: { hex: "#fef08a" } }).body?.accent).toEqual({ hex: "#fef08a" });
  });
  it.each([[{ id: "neon" }], [{ hex: "#12345" }], [{ hex: "red" }], ["violet"], [null], [{}]])("drops %j and names it", (accent) => {
    const parsed = validateShellLayoutBody({ ...body(), accent });
    expect(parsed.body?.accent).toBeUndefined();
    expect(parsed.problems).toEqual([expect.stringMatching(/^accent: .* is not a known accent or a #rrggbb color; the built-in color is used$/)]);
  });
  it("a body with no accent serializes with no accent key", () => {
    expect(serializeShellLayoutBody(body())).not.toContain("accent");
  });
});

describe("resolve: accent (per field: person > organization > none)", () => {
  const base = { standardView: false, isAdmin: false, isGuest: false };
  const violet = { id: "violet" };
  const brand = { hex: "#0f766e" };
  it("is none by default", () => {
    expect(resolveShellLayout({ ...base, person: null, organization: null }).accent).toBeNull();
  });
  it("the person's own accent wins over the organization's brand color", () => {
    expect(resolveShellLayout({ ...base, person: body({ accent: violet }), organization: body({ accent: brand }) }).accent).toEqual(violet);
  });
  it("the organization's brand color shows through a person's layout that names none", () => {
    expect(resolveShellLayout({ ...base, person: body(), organization: body({ accent: brand }) }).accent).toEqual(brand);
    expect(resolveShellLayout({ ...base, person: null, organization: body({ accent: brand }) }).accent).toEqual(brand);
  });
  it("the lock leaves only the organization's", () => {
    expect(resolveShellLayout({ ...base, person: body({ accent: violet }), organization: body({ accent: brand }), personAllowed: false }).accent).toEqual(brand);
    expect(resolveShellLayout({ ...base, person: body({ accent: violet }), organization: body(), personAllowed: false }).accent).toBeNull();
  });
  it("Standard view and guests see none", () => {
    expect(resolveShellLayout({ ...base, person: body({ accent: violet }), organization: null, standardView: true }).accent).toBeNull();
    expect(resolveShellLayout({ ...base, person: null, organization: body({ accent: brand }), isGuest: true }).accent).toBeNull();
  });
});

describe("the server's light pick agrees with the full resolver", () => {
  const violet = stored(body({ accent: { id: "violet" } }));
  const brand = stored(body({ accent: { hex: "#0f766e" } }), "r3");
  const plain = stored(body(), "r2");
  const cases: Array<[string, Partial<HeldShellLayouts>]> = [
    ["nothing stored", {}],
    ["person accent", { person: violet }],
    ["person accent over the brand color", { person: violet, organizations: { [ORG]: brand }, organizationId: ORG }],
    ["brand color through a plain person layout", { person: plain, organizations: { [ORG]: brand }, organizationId: ORG }],
    ["brand color only", { organizations: { [ORG]: brand }, organizationId: ORG }],
    ["brand of another organization", { organizations: { [ORG]: brand }, organizationId: "x" }],
    ["locked", { person: violet, organizations: { [ORG]: brand }, organizationId: ORG, personAllowed: false }],
    ["standard view", { person: violet, standardView: true }],
    ["preview names an accent", { person: plain, previewBody: serializeShellLayoutBody(body({ accent: { hex: "#db2777" } })) }],
    ["unreadable person body falls to the brand", { person: { ...plain, body: "{" }, organizations: { [ORG]: brand }, organizationId: ORG }],
    ["not (core)", { enabled: false, person: violet }],
  ];
  it.each(cases)("%s", (_name, over) => {
    const held: HeldShellLayouts = { enabled: true, person: null, organizations: {}, organizationId: null, standardView: false, ...over };
    for (const isGuest of [false, true]) {
      expect(heldShellAccent(held, { isGuest })).toEqual(resolveHeldShellLayout(held, { isAdmin: false, isGuest }).accent);
    }
  });
});

describe("the first frame", () => {
  /** Exactly what AppShell does with the pick (see the source check below). */
  const shellRoot = (held: HeldShellLayouts) => {
    const { style, ...attrs } = accentAttributes(heldShellAccent(held, { isGuest: false }));
    return renderToStaticMarkup(<div className="shell-root" {...attrs} style={style as React.CSSProperties | undefined} />);
  };
  it("an uncustomized boot stamps nothing (byte-identical root)", () => {
    const state = seedShellLayoutState({ seed: null, seedLanded: true, organizationId: null, standardView: false, reserved: false });
    expect(shellRoot(state)).toBe('<div class="shell-root"></div>');
  });
  it("a person's accent paints on the first frame, both themes' tokens inline", () => {
    const state = seedShellLayoutState({ seed: { person: stored(body({ accent: { id: "violet" } })), organizations: {} }, seedLanded: true, organizationId: ORG, standardView: false, reserved: false });
    const html = shellRoot(state);
    expect(html).toContain('data-matrx-accent="violet"');
    expect(html).toContain(`${ACCENT_PROPERTIES.light.primary}:262 83% 58%`);
    expect(html).toContain(ACCENT_PROPERTIES.dark.primary);
  });
  it("an organization's brand color paints for a member with no accent of her own", () => {
    const state = seedShellLayoutState({ seed: { person: null, organizations: { [ORG]: stored(body({ accent: { hex: "#0f766e" } })) } }, seedLanded: true, organizationId: ORG, standardView: false, reserved: false });
    expect(shellRoot(state)).toContain('data-matrx-accent="custom"');
  });
  it("AppShell stamps it on .shell-root, from the seeded slice, merged with the chat width style", () => {
    const src = readFileSync(join(__dirname, "../../components/AppShell.tsx"), "utf8");
    expect(src).toContain("heldShellAccent(initialReduxState.shellLayout");
    expect(src).toMatch(/\{\.\.\.shellLookAttributes\(shellLook\)\}\s+\{\.\.\.accentAttrs\}/);
    expect(src).toContain('{ ...accentStyle, "--shell-chat-w"');
    expect(src).toContain("(accentStyle as React.CSSProperties | undefined)");
  });
});

describe("editor helpers", () => {
  it("withAccent writes the accent and null removes it", () => {
    expect(withAccent(body(), { id: "teal" }).accent).toEqual({ id: "teal" });
    expect("accent" in withAccent(body({ accent: { id: "teal" } }), null)).toBe(false);
    expect(accentOf(null)).toBeNull();
  });
  it("a person's first edit never copies the organization's brand color (it keeps following it)", () => {
    const org = body({ accent: { hex: "#0f766e" }, look: { id: "meet-matrx" } });
    const start = startingBody(null, org, "person");
    expect(start.accent).toBeUndefined();
    expect(start.look).toEqual({ id: "meet-matrx" });
  });
});

describe("the client keeps the stamp in step", () => {
  it("applies and removes only the accent's own attribute and properties", () => {
    const el = document.createElement("div");
    el.style.setProperty("--shell-chat-w", "320px");
    applyShellAccent(el, { id: "rose" });
    expect(el.getAttribute("data-matrx-accent")).toBe("rose");
    expect(el.style.getPropertyValue(ACCENT_PROPERTIES.light.primary)).toBe("347 77% 50%");
    applyShellAccent(el, null);
    expect(el.hasAttribute("data-matrx-accent")).toBe(false);
    expect(el.style.getPropertyValue(ACCENT_PROPERTIES.light.primary)).toBe("");
    expect(el.style.getPropertyValue("--shell-chat-w")).toBe("320px");
  });
});
