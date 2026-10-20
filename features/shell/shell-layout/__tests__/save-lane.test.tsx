/**
 * A PERSON'S OWN CONSECUTIVE EDITS NEVER CONFLICT WITH THEMSELVES, AND A CHOICE SHOWS AT ONCE
 * (live walk 2026-10-20: "This layout was changed somewhere else" after a theme switch then a custom
 * accent + Enter; the accent applying ~1.6 s after the swatch press). The promises:
 *   - saves run one at a time, each against the version the previous one left, each body built from
 *     the layout as it then stands (quick choices add up, nothing is overwritten or refused);
 *   - an optimistic save is drawn at once (the preview body) and steps aside when the queue settles —
 *     onto the saved layout, or, if the write was refused, back onto the one before it;
 *   - the custom-color field uses a color once: Enter and the blur after it are ONE save;
 *   - the no-accent swatch is "Default", never the Look card's "Standard".
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { SHELL_LAYOUT_SCHEMA_VERSION, type ShellLayoutBody, type StoredShellLayout } from "../contract";
import { createShellLayoutSaveLane, type ShellLayoutSaveDeps } from "../saveLane";
import { parseShellLayoutBody, serializeShellLayoutBody } from "../validate";
import { AccentPane } from "../editor/AccentPane";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ORG = "00000000-0000-4000-8000-00000000000a";
const base: ShellLayoutBody = { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion: 1 };

/** A compare-and-swap store like the record store: a write against an old version is refused. */
function casStore(options: { refuse?: (body: ShellLayoutBody) => boolean } = {}) {
  let row: StoredShellLayout | null = { recordId: "r1", organizationId: ORG, version: 1, updatedAt: "t", body: serializeShellLayoutBody(base) };
  let held = row; // what the tab holds (the slice)
  let preview: string | null = null;
  const previews: Array<string | null> = [];
  const writes: number[] = [];
  const deps: ShellLayoutSaveDeps = {
    readCurrent: () => held,
    write: async (current, body) => {
      await new Promise((r) => setTimeout(r, 5));
      writes.push(current?.version ?? 0);
      if ((current?.version ?? 0) !== row!.version) return { ok: false, stale: true, error: "This layout was changed somewhere else. Reload it and try again." };
      if (options.refuse?.(body)) return { ok: false, error: "refused" };
      row = { ...row!, version: row!.version + 1, body: serializeShellLayoutBody(body) };
      return { ok: true, data: row };
    },
    stored: (next) => {
      held = next;
    },
    readPreview: () => preview,
    setPreview: (text) => {
      preview = text;
      previews.push(text);
    },
  };
  return { deps, writes, previews, row: () => row!, held: () => held!, preview: () => preview };
}

const bodyOf = (text: string | null) => (text ? parseShellLayoutBody(text).body : null);

describe("the save lane", () => {
  it("two quick edits both land, in order, each building on the other", async () => {
    const lane = createShellLayoutSaveLane();
    const s = casStore();
    const [a, b] = await Promise.all([
      lane.save(s.deps, (now) => ({ ...(now ?? base), look: { id: "meet-matrx" } })),
      lane.save(s.deps, (now) => ({ ...(now ?? base), accent: { hex: "#ffff00" } })),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(s.writes).toEqual([1, 2]);
    expect(bodyOf(s.row().body)).toMatchObject({ look: { id: "meet-matrx" }, accent: { hex: "#ffff00" } });
  });

  it("an optimistic save is drawn at once, then steps aside onto the saved layout", async () => {
    const lane = createShellLayoutSaveLane();
    const s = casStore();
    const pending = lane.save(s.deps, (now) => ({ ...(now ?? base), accent: { id: "green" } }), { optimistic: true });
    // Before the store answers, the shell already wears it.
    expect(bodyOf(s.preview())?.accent).toEqual({ id: "green" });
    expect((await pending).ok).toBe(true);
    expect(s.preview()).toBeNull();
    expect(bodyOf(s.held().body)?.accent).toEqual({ id: "green" });
  });

  it("quick optimistic choices add up on screen and never flash back between them", async () => {
    const lane = createShellLayoutSaveLane();
    const s = casStore();
    const one = lane.save(s.deps, (now) => ({ ...(now ?? base), look: { id: "meet-matrx" } }), { optimistic: true });
    const two = lane.save(s.deps, (now) => ({ ...(now ?? base), accent: { id: "green" } }), { optimistic: true });
    expect(bodyOf(s.preview())).toMatchObject({ look: { id: "meet-matrx" }, accent: { id: "green" } });
    await Promise.all([one, two]);
    // Set once per choice, cleared once at the end: nothing in between showed the older layout.
    expect(s.previews.map((p) => (p === null ? null : bodyOf(p)?.accent?.toString() ?? "set"))).toHaveLength(3);
    expect(s.previews.at(-1)).toBeNull();
  });

  it("a refused optimistic save puts the shell back on the layout before it", async () => {
    const lane = createShellLayoutSaveLane();
    const s = casStore({ refuse: (b) => b.accent !== undefined });
    const answer = await lane.save(s.deps, (now) => ({ ...(now ?? base), accent: { id: "green" } }), { optimistic: true });
    expect(answer.ok).toBe(false);
    expect(s.preview()).toBeNull();
    expect(bodyOf(s.held().body)?.accent).toBeUndefined();
  });
});

describe("the accent pane", () => {
  function mount(onChange: jest.Mock) {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<AccentPane value={null} onChange={onChange} />));
    return { host, root };
  }

  it("Enter and the blur after it use a custom color ONCE", () => {
    const onChange = jest.fn();
    const { host, root } = mount(onChange);
    const input = host.querySelector<HTMLInputElement>("input[aria-label='Custom color']")!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      input.focus();
      setter.call(input, "#ffff00");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    act(() => {
      input.blur();
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hex: "#ffff00" });
    act(() => root.unmount());
  });

  it("the no-accent swatch is named Default, never Standard", () => {
    const { host, root } = mount(jest.fn());
    const first = host.querySelector("[role=radiogroup] [role=radio]")!;
    expect(first.getAttribute("aria-label")).toBe("Default");
    expect(host.querySelector("[role=radio][aria-label=Standard]")).toBeNull();
    act(() => root.unmount());
  });
});
