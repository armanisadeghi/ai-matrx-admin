// features/make/gallery/SpacePageOutline.tsx — a Space template page's FIRST PAINT on its public page
// (/templates/<slug>): what a signed-out visitor sees before the editor loads and what a crawler indexes.
//
// Server-rendered from the pack's own blocks: headings, text, lists, callouts and page links as plain text, and
// every database block as a real table — its title and the first rows of its table's sample data (the block's
// view order and the shared table drawing, GridShow, with formatted values). The editor replaces it in the
// browser inside the preview's fixed-height box (TemplatePackPreview), so the swap moves nothing.

import { Square, SquareCheck } from "lucide-react";
import type { ReactNode } from "react";

import type { PackBlock, PackPage } from "@/lib/spaces-blocks/template-pack";

import { GridShow, namesOf, type ShowSpec } from "./TemplateShowcase";

/** Sample rows per table on the page the preview opens on; the other pages' outlines (hidden until the live preview
 * loads, read by crawlers) carry fewer (GALLERY-PERF: every row ships twice, the HTML and the RSC payload). */
const FIRST_ROWS = 8;
const OTHER_ROWS = 3;

const textOf = (b: PackBlock) => (b.text ?? []).map((s) => s.text).join("");

function Blocks({ blocks, ctx }: { blocks: PackBlock[]; ctx: Ctx }): ReactNode {
  return blocks.map((b, i) => <Block key={b.id ?? i} block={b} ctx={ctx} />);
}

interface Ctx {
  spec: ShowSpec;
  names: ReturnType<typeof namesOf>;
  pageTitle: (key: string) => string | null;
  rows: number;
}

function Block({ block: b, ctx }: { block: PackBlock; ctx: Ctx }): ReactNode {
  const text = textOf(b);
  const kids = b.children?.length ? <Blocks blocks={b.children} ctx={ctx} /> : null;
  if (b.type === "database" || b.type === "chart") {
    const source = (b.props?.source ?? {}) as { table?: string; view?: string };
    const table = ctx.spec.tables.find((t) => t.token === source.table);
    if (!table) return null;
    const view = ctx.spec.views?.find((v) => v.token === source.view) ?? null;
    const title = typeof b.props?.title === "string" ? b.props.title : table.name;
    return (
      <figure className="my-3 flex min-w-0 flex-col gap-1.5" data-space-outline-table={table.token}>
        <figcaption className="text-sm font-semibold text-foreground">{title}</figcaption>
        <div className="rounded-lg border border-border">
          <GridShow table={table} view={view} names={ctx.names} limit={ctx.rows} />
        </div>
      </figure>
    );
  }
  if (b.type === "page" || b.type === "linkToPage") {
    const key = String(b.props?.spaceId ?? "").replace(/^page:/, "");
    const title = ctx.pageTitle(key);
    return title ? <p className="py-0.5 text-sm font-medium text-foreground underline decoration-border underline-offset-4">{title}</p> : null;
  }
  if (b.type === "heading") {
    const level = Number(b.props?.level ?? 1);
    const cls = level <= 1 ? "mt-4 text-xl font-semibold" : level === 2 ? "mt-3 text-lg font-semibold" : "mt-2 text-base font-semibold";
    return (
      <>
        <h3 className={cls}>{text}</h3>
        {kids}
      </>
    );
  }
  if (b.type === "bulleted" || b.type === "bulletListItem" || b.type === "numbered" || b.type === "todo") {
    return (
      <div className="flex gap-2 py-0.5 text-sm">
        <span aria-hidden="true" className="flex h-5 shrink-0 items-center text-muted-foreground">
          {b.type === "todo" ? b.props?.checked ? <SquareCheck size={14} /> : <Square size={14} /> : "•"}
        </span>
        <div className="min-w-0 flex-1">
          {text}
          {kids}
        </div>
      </div>
    );
  }
  if (b.type === "callout") {
    return (
      <div className="my-2 rounded-lg bg-muted px-3 py-2 text-sm">
        {text}
        {kids}
      </div>
    );
  }
  if (b.type === "columnList") return <div className="grid gap-4 md:grid-flow-col md:auto-cols-fr">{kids}</div>;
  if (b.type === "column") return <div className="min-w-0">{kids}</div>;
  if (!text && !kids) return null;
  return (
    <>
      {text ? <p className="py-0.5 text-sm">{text}</p> : null}
      {kids ? <div className={b.type === "toggle" ? "pl-4" : undefined}>{kids}</div> : null}
    </>
  );
}

/** Each page's outline by page key, for TemplatePackPreview's first paint. */
export function spacePageOutlines(pages: PackPage[], spec: ShowSpec): Record<string, ReactNode> {
  const titles = new Map(pages.map((p) => [p.key, p.title]));
  const ctx: Ctx = { spec, names: namesOf(spec), pageTitle: (k) => titles.get(k) ?? null, rows: FIRST_ROWS };
  return Object.fromEntries(
    pages.map((p, i) => [
      p.key,
      <div key={p.key} className="flex flex-col pb-12" data-space-template-outline={p.key}>
        <Blocks blocks={p.blocks} ctx={i === 0 ? ctx : { ...ctx, rows: OTHER_ROWS }} />
      </div>,
    ]),
  );
}
