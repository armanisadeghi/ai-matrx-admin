// features/sharing/public-view/PublicViewBody.tsx — A PUBLISHED VIEW, READ-ONLY, IN THE VIEW'S OWN LAYOUT.
//
// Server-rendered, no client code: a board, a calendar and a grid are all just what the store returned
// for THIS view (its filter, its shown fields), laid out. Nothing here edits, opens a record or reaches
// for another row. Layouts without a drawing of their own here (gallery, timeline, list, chart) are
// shown as the list of cards they are made of, and the page says which layout the owner chose.

import type { ReactNode } from "react";

import { cellValue, dateOf, titleOf } from "./format";
import type { PublishedViewField, PublishedViewOpen, PublishedViewRow } from "./types";

const SHOWN_AS_LIST = new Set(["gallery", "timeline", "list", "chart"]);

function shownFields(view: PublishedViewOpen, except: Array<string | null>): PublishedViewField[] {
  return view.fields.filter((f) => f.key !== "notion_id" && !except.includes(f.key));
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{children}</span>;
}

function Cell({ view, field, row }: { view: PublishedViewOpen; field: PublishedViewField; row: PublishedViewRow }) {
  const words = cellValue(view, field, row);
  if (words.length === 0) return null;
  if (view.labels[field.key] || field.relation_target) {
    return (
      <span className="flex flex-wrap gap-1">
        {words.map((w, i) => (
          <Chip key={`${w}-${i}`}>{w}</Chip>
        ))}
      </span>
    );
  }
  return <span>{words.join(", ")}</span>;
}

function Grid({ view }: { view: PublishedViewOpen }) {
  const fields = shownFields(view, []);
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full min-w-max text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            {fields.map((f) => (
              <th key={f.key} className="px-3 py-2 font-medium">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {view.rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              {fields.map((f) => (
                <td key={f.key} className="px-3 py-1.5 align-top">
                  <Cell view={view} field={f} row={row} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Card({ view, row, fields }: { view: PublishedViewOpen; row: PublishedViewRow; fields: PublishedViewField[] }) {
  return (
    <article className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3 text-sm">
      <h3 className="font-medium">{titleOf(view, row)}</h3>
      {fields.map((f) => {
        if (cellValue(view, f, row).length === 0) return null;
        return (
          <div key={f.key} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <span className="text-muted-foreground">{f.label}</span>
            <Cell view={view} field={f} row={row} />
          </div>
        );
      })}
    </article>
  );
}

function Board({ view }: { view: PublishedViewOpen }) {
  const group = view.fields.find((f) => f.key === view.group_field);
  const titleKey = view.fields.find((f) => f.type === "text" && f.key !== "notion_id")?.key ?? null;
  const fields = shownFields(view, [view.group_field, titleKey]);
  if (!group) return <List view={view} />;
  const columns = new Map<string, PublishedViewRow[]>();
  // the columns are the choice's own order when the field has choices, then any value the rows add
  for (const w of Object.values(view.labels[group.key] ?? {})) columns.set(w, []);
  const none: PublishedViewRow[] = [];
  for (const row of view.rows) {
    const words = cellValue(view, group, row);
    if (words.length === 0) {
      none.push(row);
      continue;
    }
    for (const w of words) columns.set(w, [...(columns.get(w) ?? []), row]);
  }
  const lanes = [...columns.entries()];
  if (none.length) lanes.push(["No " + group.label.toLowerCase(), none]);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {lanes.map(([name, rows]) => (
        <section key={name} className="flex w-64 shrink-0 flex-col gap-2">
          <h2 className="flex items-baseline gap-2 text-sm font-medium">
            {name}
            <span className="text-xs font-normal text-muted-foreground">{rows.length}</span>
          </h2>
          {rows.map((row) => (
            <Card key={row.id} view={view} row={row} fields={fields} />
          ))}
        </section>
      ))}
    </div>
  );
}

function monthDays(year: number, month: number): Array<number | null> {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

function Calendar({ view }: { view: PublishedViewOpen }) {
  const dateField = view.fields.find((f) => f.key === view.date_field);
  if (!dateField) return <List view={view} />;
  const byDay = new Map<string, PublishedViewRow[]>();
  const undated: PublishedViewRow[] = [];
  for (const row of view.rows) {
    const d = dateOf(row.values[dateField.key]);
    if (!d) {
      undated.push(row);
      continue;
    }
    const k = d.toISOString().slice(0, 10);
    byDay.set(k, [...(byDay.get(k) ?? []), row]);
  }
  const months = [...new Set([...byDay.keys()].map((k) => k.slice(0, 7)))].sort();
  if (months.length === 0) return <List view={view} />;
  return (
    <div className="flex flex-col gap-6">
      {months.map((ym) => {
        const [y, m] = ym.split("-").map(Number) as [number, number];
        const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
        return (
          <section key={ym}>
            <h2 className="mb-2 text-sm font-medium">{name}</h2>
            <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-border bg-card text-xs">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="border-b border-border px-2 py-1 text-muted-foreground">
                  {d}
                </div>
              ))}
              {monthDays(y, m - 1).map((day, i) => {
                const rows = day ? (byDay.get(`${ym}-${String(day).padStart(2, "0")}`) ?? []) : [];
                return (
                  <div key={i} className="min-h-20 border-b border-r border-border p-1 last:border-r-0">
                    {day ? <div className="text-muted-foreground">{day}</div> : null}
                    {rows.map((row) => (
                      <div key={row.id} className="mt-0.5 truncate rounded bg-primary/10 px-1 py-0.5 text-primary" title={titleOf(view, row)}>
                        {titleOf(view, row)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
      {undated.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-medium">
            No {dateField.label.toLowerCase()} <span className="text-xs font-normal text-muted-foreground">{undated.length}</span>
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {undated.map((row) => (
              <Card key={row.id} view={view} row={row} fields={[]} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function List({ view }: { view: PublishedViewOpen }) {
  const fields = shownFields(view, []);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {view.rows.map((row) => (
        <Card key={row.id} view={view} row={row} fields={fields} />
      ))}
    </div>
  );
}

export function PublicViewBody({ view }: { view: PublishedViewOpen }) {
  if (view.rows.length === 0) {
    return <p className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">Nothing is on this {view.layout === "kanban" ? "board" : "view"} yet.</p>;
  }
  if (view.layout === "kanban") return <Board view={view} />;
  if (view.layout === "calendar") return <Calendar view={view} />;
  if (SHOWN_AS_LIST.has(view.layout)) return <List view={view} />;
  return <Grid view={view} />;
}

