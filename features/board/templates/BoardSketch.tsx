"use client";

// A flat picture of a board's layout for the template picker: frames, tiles (named), and the lines between them.
// No live tile is mounted, so previewing a template can never create a note, start a chat or load a record.

import type { BoardDocument } from "../board/document";

const KIND_LABELS: Record<string, string> = { text: "Write-up", label: "Text", html: "Page", stream: "AI result", thread: "Thread", record: "Record" };

/** The tile's kind as a person reads it ("social-post" -> "Social post"), never the registry key. */
function kindLabel(source: BoardDocument["nodes"][number]["source"]): string {
  const key = source.kind === "entity" ? source.entity : source.kind;
  const named = KIND_LABELS[key];
  if (named) return named;
  const words = key.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function BoardSketch({ doc }: { doc: BoardDocument }) {
  const boxes = [...doc.groups.map((g) => g.rect), ...doc.nodes.map((n) => n.rect)];
  if (boxes.length === 0) return <p className="text-sm text-muted-foreground">This board is empty.</p>;
  const pad = 40;
  const minX = Math.min(...boxes.map((r) => r.x)) - pad;
  const minY = Math.min(...boxes.map((r) => r.y)) - pad;
  const maxX = Math.max(...boxes.map((r) => r.x + r.w)) + pad;
  const maxY = Math.max(...boxes.map((r) => r.y + r.h)) + pad;
  const byId = new Map(doc.nodes.map((n) => [n.id, n.rect]));
  // A board laid out as one long column of chapters (the design-system starters: 10 chapters, 1180 × 8100) drawn as
  // one picture is a sliver of unreadable frames (ADVERSARIAL-4 N8). Past TALL, each chapter is a card with its tiles.
  if ((maxY - minY) / (maxX - minX) > TALL && doc.groups.length > 1) return <ChapterCards doc={doc} />;
  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className="h-auto w-full max-w-4xl"
      role="img"
      aria-label={`Layout: ${doc.nodes.length} tiles`}
    >
      {doc.groups.map((g) => (
        <g key={g.id}>
          <rect x={g.rect.x} y={g.rect.y} width={g.rect.w} height={g.rect.h} rx={24} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeDasharray="14 10" strokeWidth={4} />
          <text x={g.rect.x + 24} y={g.rect.y + 52} fontSize={36} fill="currentColor" fillOpacity={0.55}>
            {g.title}
          </text>
        </g>
      ))}
      {doc.edges.map((e) => {
        const a = byId.get(e.from);
        const b = byId.get(e.to);
        if (!a || !b) return null;
        return <line key={e.id} x1={a.x + a.w / 2} y1={a.y + a.h / 2} x2={b.x + b.w / 2} y2={b.y + b.h / 2} stroke="currentColor" strokeOpacity={0.45} strokeWidth={5} />;
      })}
      {doc.nodes.map((n) => (
        <g key={n.id}>
          <rect x={n.rect.x} y={n.rect.y} width={n.rect.w} height={n.rect.h} rx={16} className="fill-card stroke-border" strokeWidth={4} />
          <text x={n.rect.x + 24} y={n.rect.y + 56} fontSize={34} fontWeight={600} fill="currentColor">
            {n.title}
          </text>
          <text x={n.rect.x + 24} y={n.rect.y + 100} fontSize={26} fill="currentColor" fillOpacity={0.55}>
            {kindLabel(n.source)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Height ÷ width past which the layout picture stops being readable at page width. */
const TALL = 2.5;

const inside = (r: { x: number; y: number; w: number; h: number }, g: { x: number; y: number; w: number; h: number }) =>
  r.x + r.w / 2 >= g.x && r.x + r.w / 2 <= g.x + g.w && r.y + r.h / 2 >= g.y && r.y + r.h / 2 <= g.y + g.h;

/** The board's chapters in reading order, each a card naming its tiles. */
function ChapterCards({ doc }: { doc: BoardDocument }) {
  const groups = [...doc.groups].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  return (
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3" aria-label={`Layout: ${groups.length} chapters`} data-board-sketch-chapters="">
      {groups.map((g, i) => {
        const tiles = doc.nodes.filter((n) => inside(n.rect, g.rect)).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
        return (
          <li key={g.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-dashed border-border p-3">
            <span className="flex items-baseline gap-2">
              <span className="type-meta tabular-nums text-muted-foreground">{i + 1}</span>
              <span className="truncate type-body font-medium text-foreground">{g.title}</span>
            </span>
            {tiles.map((n) => (
              <span key={n.id} className="flex min-w-0 flex-col rounded-md border border-border bg-card px-2 py-1.5">
                <span className="truncate type-body text-foreground">{n.title}</span>
                <span className="truncate type-meta text-muted-foreground">{kindLabel(n.source)}</span>
              </span>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
