"use client";

/**
 * /data/library/unlock — the page unlocker, shown. Recent real blocked addresses (the Block Ledger,
 * read client-direct under RLS; one row per host) and a box for any address. "Try both" runs OUR
 * scraper first (free) and, when it did not read the page, the unlocker (metered), then lays them
 * side by side with a verdict. A running tally sits on top. Costs are points (dollars only for a seat
 * that sees dollars) through the library's `usePriceText`.
 */

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { Badge, Button, EmptyState, RegionSkeleton } from "@ai-matrx/design-system/controls";
import { ReadFailure } from "@ai-matrx/design-system";
import { formatCount } from "@ai-matrx/kit/format";

import { ProInput } from "@/components/official/ProInput";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { supabase } from "@/utils/supabase/client";

import { useLibraryOrganizationId, usePriceText } from "../library/hooks";
import {
  addToTally,
  dedupeByHost,
  EMPTY_TALLY,
  firstLines,
  normalizeUrl,
  reasonLabel,
  OFFERED_REASONS,
  VERDICT_LABELS,
  type BlockedUrl,
  type Compare,
  type Side,
  type Tally,
} from "./logic";
import { compareUrl } from "./server";

type Try = { state: "running" } | { state: "done"; result: Compare } | { state: "failed"; message: string };

function useBlockedUrls(organizationId: string | null) {
  return useQuery({
    queryKey: ["data-sources", "unlock", "blocked", organizationId],
    enabled: Boolean(organizationId),
    staleTime: 60_000,
    queryFn: async (): Promise<BlockedUrl[]> => {
      const { data, error } = await supabase
        .schema("platform")
        .from("acquisition_block")
        .select("id,input_ref,error_class,last_seen_at")
        .is("deleted_at", null)
        .in("error_class", OFFERED_REASONS)
        .like("input_ref", "http%")
        .order("last_seen_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      return dedupeByHost(data ?? []);
    },
  });
}

export function UnlockPage() {
  const organizationId = useLibraryOrganizationId();
  const blocked = useBlockedUrls(organizationId);
  const [tries, setTries] = useState<Record<string, Try>>({});
  const [tally, setTally] = useState<Tally>(EMPTY_TALLY);
  const [pasted, setPasted] = useState("");
  const price = usePriceText();

  const run = useCallback(
    async (url: string) => {
      if (!organizationId) return;
      setTries((t) => ({ ...t, [url]: { state: "running" } }));
      try {
        const result = await compareUrl({ organizationId, url });
        setTries((t) => ({ ...t, [url]: { state: "done", result } }));
        setTally((t) => addToTally(t, result));
      } catch (e) {
        setTries((t) => ({ ...t, [url]: { state: "failed", message: e instanceof Error ? e.message : "The try failed." } }));
      }
    },
    [organizationId],
  );

  const pastedUrl = normalizeUrl(pasted);
  const pointsText = price({ pointsPerRecord: tally.points, usd_per_record: tally.usd }, 1) ?? "0 points";
  const extra = useMemo(() => Object.keys(tries).filter((u) => !(blocked.data ?? []).some((b) => b.url === u)), [tries, blocked.data]);

  return (
    <>
      <RecordPageHeader backHref="/data/library" record={{ name: "Unlock a page" }} />
      <div className="h-full overflow-hidden pt-[var(--shell-header-h)]">
        <div className="h-full overflow-y-auto" data-matrx-page-scroll="" data-unlock-page="">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4">
            <div className="flex flex-wrap items-center gap-2" data-unlock-tally="">
              <Badge>Tried {formatCount(tally.tried)}</Badge>
              <Badge>Unlocked {formatCount(tally.unlocked)}</Badge>
              <Badge>{pointsText} spent</Badge>
            </div>

            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (pastedUrl) void run(pastedUrl);
              }}
            >
              <div className="min-w-64 flex-1">
                <ProInput
                  value={pasted}
                  placeholder="https://"
                  enableCleanup={false}
                  enableVoice={false}
                  onChange={(e) => setPasted(e.target.value)}
                  aria-label="Address to try"
                  data-field="unlock-url"
                />
              </div>
              <Button type="submit" disabled={!pastedUrl || !organizationId} data-action="unlock-try-pasted">
                Try both
              </Button>
            </form>

            {extra.map((url) => (
              <TryRow key={url} url={url} reason={null} attempt={tries[url]} onTry={run} />
            ))}

            {!organizationId || blocked.isLoading ? (
              <RegionSkeleton shape="rows" count={6} aria-label="Loading blocked addresses" />
            ) : blocked.error ? (
              <ReadFailure error={blocked.error} what="the blocked addresses" onRetry={() => void blocked.refetch()} />
            ) : (blocked.data ?? []).length === 0 ? (
              <EmptyState icon={<LockKeyhole className="size-5" />} title="Nothing blocked yet" />
            ) : (
              <div className="flex flex-col gap-3">
                {(blocked.data ?? []).map((b) => (
                  <TryRow key={b.id} url={b.url} reason={b.reason} attempt={tries[b.url]} onTry={run} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TryRow({ url, reason, attempt, onTry }: { url: string; reason: string | null; attempt?: Try; onTry: (url: string) => void }) {
  const running = attempt?.state === "running";
  return (
    <div className="rounded-lg border border-border bg-card p-3" data-unlock-row={url}>
      <div className="flex flex-wrap items-center gap-2">
        {reason && <Badge>{reasonLabel(reason)}</Badge>}
        <span className="min-w-0 flex-1 truncate text-sm" title={url}>
          {url}
        </span>
        <Button type="button" onClick={() => onTry(url)} disabled={running} data-action="unlock-try">
          {running ? "Trying" : attempt ? "Try again" : "Try both"}
        </Button>
      </div>
      {attempt?.state === "failed" && <p className="mt-2 text-sm text-destructive">{attempt.message}</p>}
      {attempt?.state === "done" && <SideBySide result={attempt.result} />}
    </div>
  );
}

function SideBySide({ result }: { result: Compare }) {
  const price = usePriceText();
  const cost = result.unlocker ? price({ pointsPerRecord: result.unlocker.points ?? 0, usd_per_record: result.unlocker.cost_usd ?? 0 }, 1) : null;
  return (
    <div className="mt-3 flex flex-col gap-2" data-unlock-result={result.verdict}>
      <div className="flex items-center gap-2">
        <Badge data-verdict={result.verdict}>{VERDICT_LABELS[result.verdict]}</Badge>
        {cost && result.unlocker?.points ? <span className="text-xs text-muted-foreground">{cost}</span> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Cell title="Our scraper" side={result.ours} />
        {result.unlocker ? <Cell title="Unlocker" side={result.unlocker} /> : <Cell title="Unlocker" side={null} />}
      </div>
    </div>
  );
}

function Cell({ title, side }: { title: string; side: Side | null }) {
  return (
    <div className="rounded-md border border-border p-2" data-unlock-cell={title}>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div>
      {!side ? (
        <p className="text-sm text-muted-foreground">Not run</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{side.status ? `Status ${side.status}` : "No status"}</span>
            <span>{formatCount(side.text_chars)} characters</span>
            <span>{side.elapsed_s.toFixed(1)} s</span>
            {!side.ok && (side.failure_reason || side.error_code) && <span>{side.failure_reason ?? side.error_code}</span>}
          </div>
          {side.preview && <pre className="mt-1 whitespace-pre-wrap break-words text-sm">{firstLines(side.preview)}</pre>}
        </>
      )}
    </div>
  );
}
