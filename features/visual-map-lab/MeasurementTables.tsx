"use client";

// features/visual-map-lab/MeasurementTables.tsx — inspection.v1 as readable tables (text, overlaps, out of bounds,
// crossings, contrast, console errors) with the issue counts the Copy for AI package uses, then the raw JSON.

import { issuesOf, type Inspection } from "@ai-matrx/alchemy/operate/inspect";
import { cn } from "@/lib/utils";
import { DataTable, JsonTables, RawJson } from "./JsonTables";

const isObj = (v: unknown): v is Record<string, unknown> => v != null && typeof v === "object" && !Array.isArray(v);
export const isInspection = (v: unknown): v is Inspection => isObj(v) && v.schemaVersion === 1 && Array.isArray(v.text);

/** Named inspections out of whatever the sample holds: one inspection, or a map "1440:dark" -> inspection | {error}. */
export function inspectionEntries(measurements: unknown): Array<{ key: string; inspection: Inspection | null; error: string | null }> {
  if (isInspection(measurements)) return [{ key: "", inspection: measurements, error: null }];
  if (!isObj(measurements)) return [];
  const out: Array<{ key: string; inspection: Inspection | null; error: string | null }> = [];
  for (const [key, value] of Object.entries(measurements)) {
    if (isInspection(value)) out.push({ key, inspection: value, error: null });
    else if (isObj(value) && typeof value.error === "string") out.push({ key, inspection: null, error: value.error });
  }
  return out;
}

function Counts({ inspection }: { inspection: Inspection }) {
  const i = issuesOf(inspection);
  const rows = [
    { check: "Clipped text", count: i.clippedText.length },
    { check: "Truncated text", count: i.truncatedText.length },
    { check: "Overlaps", count: i.overlaps },
    { check: "Out of bounds", count: i.outOfBounds },
    { check: "Line crossings", count: i.crossings },
    { check: "Label on line", count: i.labelOnLine },
    { check: "Low contrast", count: i.lowContrast.length },
    { check: "Console errors", count: i.consoleErrors },
    { check: "Total", count: i.total },
  ];
  return (
    <div className="overflow-auto rounded-md border border-border">
      <table className="w-full border-collapse text-left type-secondary">
        <tbody>
          {rows.map((r) => (
            <tr key={r.check} className={cn("border-b border-border/60 last:border-0", r.check === "Total" && "font-medium")}>
              <td className="px-2 py-1">{r.check}</td>
              <td className={cn("px-2 py-1 text-right tabular-nums", r.count > 0 && "text-destructive")}>{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function One({ inspection }: { inspection: Inspection }) {
  const texts = inspection.text.map((t) => ({
    id: t.id,
    text: t.text,
    px: t.px,
    x: t.box.x,
    y: t.box.y,
    w: t.box.w,
    h: t.box.h,
    clipped: t.clipped ? "yes" : "",
    truncated: t.truncated ? "yes" : "",
  }));
  return (
    <div className="flex flex-col gap-3">
      <DataTable
        columns={["name", "value"]}
        rows={[
          { name: "Viewport", value: `${inspection.viewport.w} x ${inspection.viewport.h} @${inspection.viewport.dpr}` },
          { name: "Theme", value: inspection.theme },
          { name: "Picture box", value: `${inspection.box.w} x ${inspection.box.h}` },
          { name: "Container", value: `${inspection.container.w} x ${inspection.container.h}` },
        ]}
      />
      <Counts inspection={inspection} />
      {texts.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="type-secondary font-medium">Text · {texts.length}</span>
          <DataTable rows={texts} />
        </div>
      )}
      {inspection.overlaps.length > 0 && <DataTable rows={inspection.overlaps} />}
      {inspection.outOfBounds.length > 0 && <DataTable rows={inspection.outOfBounds.map((id) => ({ outOfBounds: id }))} />}
      {inspection.crossings.length > 0 && <DataTable rows={inspection.crossings.map((c) => ({ a: c.a, b: c.b, point: c.point.join(", ") }))} />}
      {inspection.labelOnLine.length > 0 && <DataTable rows={inspection.labelOnLine} />}
      {inspection.contrast.length > 0 && <DataTable rows={inspection.contrast} />}
      {inspection.consoleErrors.length > 0 && <DataTable rows={inspection.consoleErrors.map((e) => ({ consoleError: e }))} />}
    </div>
  );
}

export function MeasurementTables({ measurements, label = "Measurements" }: { measurements: unknown; label?: string }) {
  const entries = inspectionEntries(measurements);
  if (measurements == null || (isObj(measurements) && Object.keys(measurements).length === 0)) {
    return <span className="type-secondary text-muted-foreground">None</span>;
  }
  if (entries.length === 0) return <JsonTables value={measurements} label={label} />;
  return (
    <div className="flex flex-col gap-4">
      {entries.map((e) => (
        <section key={e.key || "one"} className="flex flex-col gap-2">
          {e.key && <span className="type-body font-medium">{e.key}</span>}
          {e.inspection ? <One inspection={e.inspection} /> : <DataTable columns={["error"]} rows={[{ error: e.error }]} />}
        </section>
      ))}
      <RawJson value={measurements} label={label} />
    </div>
  );
}
