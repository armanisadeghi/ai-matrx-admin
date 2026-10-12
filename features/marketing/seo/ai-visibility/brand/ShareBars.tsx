import type { BrandCheckEntry } from "./types";

/** The leaderboard: the brand against each competitor, as horizontal bars of share of voice. */
export function ShareBars({ entries, limit }: { entries: BrandCheckEntry[]; limit?: number }) {
  const rows = [...entries]
    .sort((a, b) => (b.share_pct ?? -1) - (a.share_pct ?? -1))
    .slice(0, limit ?? entries.length);
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center gap-2 text-xs">
          <span className={`w-28 shrink-0 truncate ${row.is_target ? "font-medium" : "text-muted-foreground"}`}>
            {row.name}
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={`block h-full rounded-full ${row.is_target ? "bg-primary" : "bg-muted-foreground/40"}`}
              style={{ width: `${Math.max(0, Math.min(100, row.share_pct ?? 0))}%` }}
            />
          </span>
          <span className="w-12 shrink-0 text-right tabular-nums">
            {row.share_pct == null ? "no data" : `${row.share_pct}%`}
          </span>
        </li>
      ))}
    </ul>
  );
}
