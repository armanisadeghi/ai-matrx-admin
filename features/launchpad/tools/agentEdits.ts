// features/launchpad/tools/agentEdits.ts — the launchpad agent tools' pure half: validate one call against the
// catalog and apply it with the doc verbs (../doc.ts). No React, so the same rules are unit-tested.
//
// The tool names and the s / m / l sizes are the Start page's (the `start_page.maintainer` agent was built on
// them); they now drive a launchpad: s / m / l are a quarter / half / full desktop width, and `w` / `h` give
// fine control in 12-column grid units.
import type { LaunchpadDoc } from "@/features/shell/shell-layout/contract";
import { LAUNCHPAD_WIDGET_CATALOG, START_SIZE_WIDTH, describeLaunchpadWidget, getLaunchpadWidgetSpec, type StartSize } from "../widgets/catalog";
import { addWidget, configureWidget, moveWidget, readingOrder, removeWidget, resizeWidget } from "../doc";

export type AgentEdit = { ok: true; doc: LaunchpadDoc; result: Record<string, unknown> } | { ok: false; error: string };

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : undefined);
const isSize = (v: unknown): v is StartSize => v === "s" || v === "m" || v === "l";

/** The old size word for a desktop width (what the agent reads). */
export function sizeWord(w: number): StartSize {
  return w <= START_SIZE_WIDTH.s ? "s" : w <= START_SIZE_WIDTH.m ? "m" : "l";
}

function cleanConfig(type: string, raw: unknown): { ok: true; config: Record<string, string> } | { ok: false; error: string } {
  const spec = getLaunchpadWidgetSpec(type);
  const config: Record<string, string> = {};
  for (const [k, v] of Object.entries(rec(raw))) {
    const field = spec?.fields.find((f) => f.key === k);
    if (!field) return { ok: false, error: `"${type}" has no config field "${k}". Fields: ${spec?.fields.map((f) => f.key).join(", ") || "none"}.` };
    const value = typeof v === "string" ? v : v == null ? "" : String(v);
    if (value && field.options && !field.options.some((o) => o.value === value)) {
      return { ok: false, error: `"${value}" is not a choice for ${k}. Choices: ${field.options.map((o) => o.value).join(", ")}.` };
    }
    config[k] = value;
  }
  return { ok: true, config };
}

export function readForAgent(doc: LaunchpadDoc, pending: number) {
  return {
    widgets: readingOrder(doc).map((w, position) => ({
      id: w.id,
      type: w.type,
      size: sizeWord(w.layout.lg.w),
      x: w.layout.lg.x,
      y: w.layout.lg.y,
      w: w.layout.lg.w,
      h: w.layout.lg.h,
      config: w.config,
      describe: describeLaunchpadWidget(w),
      position,
    })),
    pending_changes: pending,
  };
}

export function catalogForAgent() {
  return LAUNCHPAD_WIDGET_CATALOG.map((s) => ({
    type: s.type,
    label: s.label,
    section: s.section,
    sizes: (["s", "m", "l"] as const).filter((z) => START_SIZE_WIDTH[z] >= s.sizes.minW && START_SIZE_WIDTH[z] <= (s.sizes.maxW ?? 12)),
    grid: s.sizes,
    default_config: s.defaultConfig,
    fields: s.fields.map((f) => ({ key: f.key, label: f.label, ...(f.options ? { options: f.options } : {}), ...(f.picker ? { picker: f.picker } : {}) })),
    describe: s.describe(s.defaultConfig),
  }));
}

/** Width and height from a call: `w`/`h` win, else the size word, else the widget's default. */
function sizeFrom(i: Record<string, unknown>, type: string): { ok: true; w?: number; h?: number } | { ok: false; error: string } {
  const spec = getLaunchpadWidgetSpec(type);
  const w = int(i.w) ?? (isSize(i.size) ? START_SIZE_WIDTH[i.size] : undefined);
  if (i.size !== undefined && !isSize(i.size)) return { ok: false, error: "`size` is s, m or l (or pass `w` / `h` in grid units)." };
  if (spec && w !== undefined && (w < spec.sizes.minW || w > (spec.sizes.maxW ?? 12))) {
    return { ok: false, error: `"${type}" is ${spec.sizes.minW} to ${spec.sizes.maxW ?? 12} columns wide.` };
  }
  const h = int(i.h);
  return { ok: true, ...(w !== undefined ? { w } : {}), ...(h !== undefined ? { h } : {}) };
}

export function applyAgentEdit(doc: LaunchpadDoc, tool: string, input: unknown): AgentEdit {
  const i = rec(input);
  const id = str(i.id);
  const widget = id ? doc.widgets.find((w) => w.id === id) : undefined;
  const needWidget = (): AgentEdit | null =>
    widget ? null : { ok: false, error: id ? `No widget "${id}" on the page; start_read_page lists the ids.` : "Pass the widget's `id`." };
  switch (tool) {
    case "start_add_widget": {
      const type = str(i.type);
      const spec = type ? getLaunchpadWidgetSpec(type) : undefined;
      if (!spec) return { ok: false, error: `Unknown widget type "${String(i.type)}". start_list_widgets lists them.` };
      const size = sizeFrom(i, spec.type);
      if (!size.ok) return size;
      const cfg = cleanConfig(spec.type, i.config);
      if (!cfg.ok) return cfg;
      const position = int(i.position);
      const next = addWidget(
        doc,
        { type: spec.type, config: { ...spec.defaultConfig, ...cfg.config }, ...(size.w !== undefined ? { w: size.w } : {}), ...(size.h !== undefined ? { h: size.h } : {}) },
        position,
      );
      const added = next.widgets.find((w) => !doc.widgets.some((d) => d.id === w.id))!;
      return { ok: true, doc: next, result: { ok: true, id: added.id, position: readingOrder(next).indexOf(added) } };
    }
    case "start_remove_widget": {
      const missing = needWidget();
      if (missing) return missing;
      return { ok: true, doc: removeWidget(doc, id!), result: { ok: true, removed: id } };
    }
    case "start_move_widget": {
      const missing = needWidget();
      if (missing) return missing;
      const position = int(i.position);
      if (position === undefined) return { ok: false, error: "Pass `position` (0-based)." };
      const next = moveWidget(doc, id!, position);
      return { ok: true, doc: next, result: { ok: true, id, position: readingOrder(next).findIndex((w) => w.id === id) } };
    }
    case "start_resize_widget": {
      const missing = needWidget();
      if (missing) return missing;
      const size = sizeFrom(i, widget!.type);
      if (!size.ok) return size;
      if (size.w === undefined && size.h === undefined) return { ok: false, error: "Pass `size` (s, m, l) or `w` / `h`." };
      const next = resizeWidget(doc, id!, { ...(size.w !== undefined ? { w: size.w } : {}), ...(size.h !== undefined ? { h: size.h } : {}) });
      const lg = next.widgets.find((w) => w.id === id)!.layout.lg;
      return { ok: true, doc: next, result: { ok: true, id, size: sizeWord(lg.w), w: lg.w, h: lg.h } };
    }
    case "start_configure_widget": {
      const missing = needWidget();
      if (missing) return missing;
      const cfg = cleanConfig(widget!.type, i.config);
      if (!cfg.ok) return cfg;
      const next = configureWidget(doc, id!, cfg.config);
      return { ok: true, doc: next, result: { ok: true, id, config: next.widgets.find((w) => w.id === id)!.config } };
    }
    default:
      return { ok: false, error: `Unknown tool ${tool}.` };
  }
}
