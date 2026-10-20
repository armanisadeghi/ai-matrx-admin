// features/shell/shell-layout/validate.ts — the ONE reader of a stored layout body.
//
// `parseShellLayoutBody` never throws. A body that is not a v1 layout at all (not JSON, not an
// object, another schemaVersion) is refused whole: `body: null`, and the caller renders the
// default and says so. Anything smaller is repaired node by node and NAMED in `problems` — a
// stored menu never disappears over one bad row:
//   - a node deeper than SHELL_LAYOUT_MAX_DEPTH, a duplicate node id, a malformed node, an
//     unknown kind → that node is refused (dropped) and reported;
//   - a `ref` to a retired nav id → rewritten to its successor and reported;
//   - a `ref` no catalog entry answers → KEPT (it may be an admin row, or come back) and reported;
//     the resolver drops it from render;
//   - a missing reserved header control → re-added at its default place and reported;
//   - a Dock longer than SHELL_DOCK_MAX_ITEMS → cut to the limit and reported;
//   - a `look` naming no registered look (./looks.ts) → dropped (standard applies) and reported.
//   - an `accent` that is neither a curated id (@ai-matrx/design-system/accents) nor a `#rgb`/`#rrggbb`
//     hex → dropped (the built-in primary applies) and reported; a hex is stored normalized.
// An editor refuses to save while `problems` is non-empty; the boot path renders the repaired body.

import { isShellIconName, type ShellIconName } from "@/features/shell/shellIconMap";
import {
  RESERVED_HEADER_CONTROLS,
  SHELL_LAYOUT_MAX_DEPTH,
  SHELL_LAYOUT_SCHEMA_VERSION,
  type HeaderButton,
  type HeaderControlId,
  type ShellAccentRef,
  type ShellLanding,
  type ShellLayoutBody,
  type ShellNode,
} from "./contract";
import { DEFAULT_HEADER_CONTROLS, isKnownCatalogId } from "./catalog";
import { resolveRetiredNavId } from "./retired-nav-ids";
import { isShellLookId } from "./looks";
import { parseAccentRef } from "@ai-matrx/design-system/accents";

/** The most rows a phone Dock holds. */
export const SHELL_DOCK_MAX_ITEMS = 8;

export interface ParsedShellLayout {
  body: ShellLayoutBody | null;
  problems: string[];
}

const HEADER_CONTROL_IDS: readonly HeaderControlId[] = DEFAULT_HEADER_CONTROLS;
const BODY_KEYS = new Set(["schemaVersion", "basedOnCatalogVersion", "sidebar", "header", "dock", "landing", "look", "accent", "dismissedNew"]);

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

interface Ctx {
  problems: string[];
  seenIds: Set<string>;
}

/** A `ref` as it should be stored: retired ids follow their successor; unknown ids are kept and flagged. */
function checkRef(ref: string, at: string, ctx: Ctx): string {
  const { id, retired } = resolveRetiredNavId(ref);
  if (retired && id !== null) {
    ctx.problems.push(`${at}: "${ref}" was retired; now "${id}"`);
    return id;
  }
  if (retired) {
    ctx.problems.push(`${at}: "${ref}" was retired with no successor`);
    return ref;
  }
  if (!isKnownCatalogId(ref)) ctx.problems.push(`${at}: unknown destination "${ref}"`);
  return ref;
}

function optionalIcon(value: unknown, at: string, ctx: Ctx): ShellIconName | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && isShellIconName(value)) return value;
  ctx.problems.push(`${at}: unknown icon ${JSON.stringify(value)} dropped`);
  return undefined;
}

function requiredIcon(value: unknown, fallback: ShellIconName, at: string, ctx: Ctx): ShellIconName {
  if (typeof value === "string" && isShellIconName(value)) return value;
  ctx.problems.push(`${at}: unknown icon ${JSON.stringify(value)}; using ${fallback}`);
  return fallback;
}

/** The common head of every node/button: an object with a unique id and a kind. */
function head(raw: unknown, at: string, ctx: Ctx): { item: Raw; id: string; kind: string } | null {
  if (!isRecord(raw)) {
    ctx.problems.push(`${at}: not an object; dropped`);
    return null;
  }
  const id = str(raw.id);
  const kind = str(raw.kind);
  if (!id || !kind) {
    ctx.problems.push(`${at}: missing id or kind; dropped`);
    return null;
  }
  if (ctx.seenIds.has(id)) {
    ctx.problems.push(`${at}: duplicate id "${id}"; dropped`);
    return null;
  }
  ctx.seenIds.add(id);
  return { item: raw, id, kind };
}

function parseNodes(raw: unknown, depth: number, at: string, ctx: Ctx, allowChildren: boolean): ShellNode[] {
  if (!Array.isArray(raw)) {
    ctx.problems.push(`${at}: not a list; dropped`);
    return [];
  }
  const out: ShellNode[] = [];
  raw.forEach((value, index) => {
    const node = parseNode(value, depth, `${at}[${index}]`, ctx, allowChildren);
    if (node) out.push(node);
  });
  return out;
}

function parseChildren(item: Raw, depth: number, at: string, ctx: Ctx, allowChildren: boolean): ShellNode[] | undefined {
  if (item.children === undefined) return undefined;
  if (!allowChildren) {
    ctx.problems.push(`${at}: rows here have no submenu; children dropped`);
    return undefined;
  }
  if (depth >= SHELL_LAYOUT_MAX_DEPTH) {
    ctx.problems.push(`${at}: deeper than ${SHELL_LAYOUT_MAX_DEPTH} levels; children dropped`);
    return undefined;
  }
  return parseNodes(item.children, depth + 1, `${at}.children`, ctx, allowChildren);
}

function parseNode(raw: unknown, depth: number, at: string, ctx: Ctx, allowChildren: boolean): ShellNode | null {
  const h = head(raw, at, ctx);
  if (!h) return null;
  const { item, id, kind } = h;
  switch (kind) {
    case "nav": {
      const ref = str(item.ref);
      if (!ref) {
        ctx.problems.push(`${at}: nav row without ref; dropped`);
        return null;
      }
      const label = str(item.label);
      const icon = optionalIcon(item.icon, at, ctx);
      const children = parseChildren(item, depth, at, ctx, allowChildren);
      return {
        kind: "nav",
        id,
        ref: checkRef(ref, at, ctx),
        ...(label ? { label } : {}),
        ...(icon ? { icon } : {}),
        ...(children ? { children } : {}),
      };
    }
    case "link": {
      const label = str(item.label);
      const href = str(item.href);
      if (!label || !href) {
        ctx.problems.push(`${at}: link without label or href; dropped`);
        return null;
      }
      return {
        kind: "link",
        id,
        label,
        icon: requiredIcon(item.icon, "Link2", at, ctx),
        href,
        ...(item.newTab === true ? { newTab: true } : {}),
      };
    }
    case "record": {
      const label = str(item.label);
      const token = str(item.token);
      const recordId = str(item.recordId);
      const href = str(item.href);
      if (!label || !token || !recordId || !href) {
        ctx.problems.push(`${at}: record without label, token, recordId or href; dropped`);
        return null;
      }
      const icon = optionalIcon(item.icon, at, ctx);
      return { kind: "record", id, label, token, recordId, href, ...(icon ? { icon } : {}) };
    }
    case "launchpad": {
      const key = str(item.key);
      const label = str(item.label);
      if (!key || !label) {
        ctx.problems.push(`${at}: launchpad without key or label; dropped`);
        return null;
      }
      const icon = optionalIcon(item.icon, at, ctx);
      return { kind: "launchpad", id, key, label, ...(icon ? { icon } : {}) };
    }
    case "group": {
      const label = str(item.label);
      if (!label) {
        ctx.problems.push(`${at}: group without label; dropped`);
        return null;
      }
      if (!allowChildren) {
        ctx.problems.push(`${at}: groups are not allowed here; dropped`);
        return null;
      }
      const icon = requiredIcon(item.icon, "Folder", at, ctx);
      const children =
        item.children === undefined ? [] : (parseChildren(item, depth, at, ctx, allowChildren) ?? []);
      return { kind: "group", id, label, icon, children };
    }
    default:
      ctx.problems.push(`${at}: unknown kind "${kind}"; dropped`);
      return null;
  }
}

function parseHeader(raw: unknown, ctx: Ctx): HeaderButton[] {
  if (!Array.isArray(raw)) {
    ctx.problems.push(`header: not a list; default header used`);
    return reAddReserved([], ctx);
  }
  const out: HeaderButton[] = [];
  const controls = new Set<HeaderControlId>();
  raw.forEach((value, index) => {
    const at = `header[${index}]`;
    const h = head(value, at, ctx);
    if (!h) return;
    const { item, id, kind } = h;
    switch (kind) {
      case "control": {
        const control = HEADER_CONTROL_IDS.find((c) => c === item.control);
        if (!control) {
          ctx.problems.push(`${at}: unknown control ${JSON.stringify(item.control)}; dropped`);
          return;
        }
        if (controls.has(control)) {
          ctx.problems.push(`${at}: control "${control}" listed twice; dropped`);
          return;
        }
        controls.add(control);
        out.push({ kind: "control", id, control });
        return;
      }
      case "nav": {
        const ref = str(item.ref);
        if (!ref) {
          ctx.problems.push(`${at}: nav button without ref; dropped`);
          return;
        }
        const label = str(item.label);
        const icon = optionalIcon(item.icon, at, ctx);
        out.push({ kind: "nav", id, ref: checkRef(ref, at, ctx), ...(label ? { label } : {}), ...(icon ? { icon } : {}) });
        return;
      }
      case "link": {
        const label = str(item.label);
        const href = str(item.href);
        if (!label || !href) {
          ctx.problems.push(`${at}: link without label or href; dropped`);
          return;
        }
        out.push({
          kind: "link",
          id,
          label,
          icon: requiredIcon(item.icon, "Link2", at, ctx),
          href,
          ...(item.newTab === true ? { newTab: true } : {}),
        });
        return;
      }
      case "launchpad": {
        const key = str(item.key);
        const label = str(item.label);
        if (!key || !label) {
          ctx.problems.push(`${at}: launchpad without key or label; dropped`);
          return;
        }
        const icon = optionalIcon(item.icon, at, ctx);
        out.push({ kind: "launchpad", id, key, label, ...(icon ? { icon } : {}) });
        return;
      }
      case "mandate": {
        const label = str(item.label);
        const mandateKey = str(item.mandateKey);
        if (!label || !mandateKey) {
          ctx.problems.push(`${at}: mandate button without label or mandateKey; dropped`);
          return;
        }
        out.push({ kind: "mandate", id, label, icon: requiredIcon(item.icon, "Zap", at, ctx), mandateKey });
        return;
      }
      default:
        ctx.problems.push(`${at}: unknown kind "${kind}"; dropped`);
    }
  });
  return reAddReserved(out, ctx);
}

/** Puts every missing reserved control back, at its place in the default order. */
function reAddReserved(buttons: HeaderButton[], ctx: Ctx): HeaderButton[] {
  const out = [...buttons];
  for (const reserved of RESERVED_HEADER_CONTROLS) {
    if (out.some((b) => b.kind === "control" && b.control === reserved)) continue;
    let id = `control.${reserved}`;
    while (ctx.seenIds.has(id)) id = `${id}-reserved`;
    ctx.seenIds.add(id);
    const order = DEFAULT_HEADER_CONTROLS.indexOf(reserved);
    const before = out.findIndex(
      (b) => b.kind === "control" && DEFAULT_HEADER_CONTROLS.indexOf(b.control) > order,
    );
    const button: HeaderButton = { kind: "control", id, control: reserved };
    if (before === -1) out.push(button);
    else out.splice(before, 0, button);
    ctx.problems.push(`header: "${reserved}" cannot be removed; put back`);
  }
  return out;
}

function parseLanding(raw: unknown, ctx: Ctx): ShellLanding | undefined {
  if (isRecord(raw)) {
    const key = str(raw.key);
    const href = str(raw.href);
    if (raw.kind === "launchpad" && key) return { kind: "launchpad", key };
    if (raw.kind === "href" && href) return { kind: "href", href };
  }
  ctx.problems.push(`landing: not a launchpad or an href; default landing used`);
  return undefined;
}

/** A Look reference: a known look id, else dropped (the standard look applies) and reported. */
function parseLook(raw: unknown, ctx: Ctx): { id: string } | undefined {
  if (isRecord(raw) && isShellLookId(raw.id)) return { id: raw.id };
  const id = isRecord(raw) ? raw.id : raw;
  ctx.problems.push(`look: unknown look ${JSON.stringify(id)}; the standard look is used`);
  return undefined;
}

/** An accent: a curated id or a hex (normalized), else dropped (the built-in primary applies) and reported. */
function parseAccent(raw: unknown, ctx: Ctx): ShellAccentRef | undefined {
  const accent = parseAccentRef(raw);
  if (accent) return accent;
  ctx.problems.push(`accent: ${JSON.stringify(raw)} is not a known accent or a #rrggbb color; the built-in color is used`);
  return undefined;
}

/** Validates an already-decoded value as a layout body (same rules as `parseShellLayoutBody`). */
export function validateShellLayoutBody(value: unknown): ParsedShellLayout {
  const ctx: Ctx = { problems: [], seenIds: new Set() };
  if (!isRecord(value)) return { body: null, problems: ["body: not an object; default layout used"] };
  if (value.schemaVersion !== SHELL_LAYOUT_SCHEMA_VERSION) {
    return {
      body: null,
      problems: [
        `body: schemaVersion ${JSON.stringify(value.schemaVersion)} is not ${SHELL_LAYOUT_SCHEMA_VERSION}; default layout used`,
      ],
    };
  }
  for (const key of Object.keys(value)) {
    if (!BODY_KEYS.has(key)) ctx.problems.push(`body: unknown field "${key}" dropped`);
  }
  let basedOnCatalogVersion = 1;
  if (typeof value.basedOnCatalogVersion === "number" && Number.isInteger(value.basedOnCatalogVersion) && value.basedOnCatalogVersion >= 1) {
    basedOnCatalogVersion = value.basedOnCatalogVersion;
  } else {
    ctx.problems.push(`body: basedOnCatalogVersion missing or invalid; read as 1`);
  }
  const body: ShellLayoutBody = { schemaVersion: SHELL_LAYOUT_SCHEMA_VERSION, basedOnCatalogVersion };
  // Node ids are unique within a region (the same id may appear in the Sidebar and the Dock).
  const region = (): Ctx => ({ problems: ctx.problems, seenIds: new Set() });
  if (value.sidebar !== undefined) body.sidebar = parseNodes(value.sidebar, 1, "sidebar", region(), true);
  if (value.header !== undefined) body.header = parseHeader(value.header, region());
  if (value.dock !== undefined) {
    let dock = parseNodes(value.dock, 1, "dock", region(), false);
    if (dock.length > SHELL_DOCK_MAX_ITEMS) {
      ctx.problems.push(`dock: ${dock.length} rows; only the first ${SHELL_DOCK_MAX_ITEMS} kept`);
      dock = dock.slice(0, SHELL_DOCK_MAX_ITEMS);
    }
    body.dock = dock;
  }
  if (value.landing !== undefined) {
    const landing = parseLanding(value.landing, ctx);
    if (landing) body.landing = landing;
  }
  if (value.look !== undefined) {
    const look = parseLook(value.look, ctx);
    if (look) body.look = look;
  }
  if (value.accent !== undefined) {
    const accent = parseAccent(value.accent, ctx);
    if (accent) body.accent = accent;
  }
  if (value.dismissedNew !== undefined) {
    if (Array.isArray(value.dismissedNew)) {
      body.dismissedNew = value.dismissedNew.filter((id): id is string => typeof id === "string");
      if (body.dismissedNew.length !== value.dismissedNew.length) ctx.problems.push(`dismissedNew: non-text ids dropped`);
    } else {
      ctx.problems.push(`dismissedNew: not a list; dropped`);
    }
  }
  return { body, problems: ctx.problems };
}

/** Reads stored layout text. Never throws; see the header of this file for what is refused or repaired. */
export function parseShellLayoutBody(text: string): ParsedShellLayout {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { body: null, problems: [`body: not valid JSON (${reason}); default layout used`] };
  }
  return validateShellLayoutBody(value);
}

/** The stored text for a body: fields in contract order, nothing else. */
export function serializeShellLayoutBody(body: ShellLayoutBody): string {
  const ordered: ShellLayoutBody = {
    schemaVersion: body.schemaVersion,
    basedOnCatalogVersion: body.basedOnCatalogVersion,
    ...(body.sidebar !== undefined ? { sidebar: body.sidebar } : {}),
    ...(body.header !== undefined ? { header: body.header } : {}),
    ...(body.dock !== undefined ? { dock: body.dock } : {}),
    ...(body.landing !== undefined ? { landing: body.landing } : {}),
    ...(body.look !== undefined ? { look: { id: body.look.id } } : {}),
    ...(body.accent !== undefined ? { accent: "id" in body.accent ? { id: body.accent.id } : { hex: body.accent.hex } } : {}),
    ...(body.dismissedNew !== undefined ? { dismissedNew: body.dismissedNew } : {}),
  };
  return JSON.stringify(ordered);
}
