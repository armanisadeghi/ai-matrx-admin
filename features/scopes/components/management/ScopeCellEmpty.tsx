// A /scopes hub cell with no value: "…" while the values read is in flight, "—" once it answered
// empty. Full muted ink — the old `/50` alpha read as a faint smudge on the Mac rows (lane
// mac-default-2). The cell, not the table, says it is loading: the rows are not stale, so the hub
// never passes the table `isFetching` (that drew a refresh bar under every section's toolbar and
// dimmed every row while only the cells were pending).
export function ScopeCellEmpty({ loading }: { loading: boolean }) {
  return (
    <span className="text-muted-foreground" aria-busy={loading || undefined}>
      {loading ? "…" : "—"}
    </span>
  );
}
