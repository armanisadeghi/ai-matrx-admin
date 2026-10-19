"use client";

// features/marketing/seo/domain-research/WebsiteCheck.tsx — THE OVERVIEW of the domain page: one press
// checks a website three ways and lays the answers side by side. Champion: Ahrefs' free checker (one
// box, one button, big numbers); beaten by showing the price before the press, the real cost after each
// answer, a second and third source beside the first, and the rows saving into a table.
//
// Every number comes from a catalog Tool run as a durable call (`/tools/calls`): authority (Moz),
// backlinks (our own link counts), search and ads (SpyFu). Nothing auto-spends: a press states its price.
// The call ids ride in the address (`?ca=&cl=&cs=&cr=`), so a reload reads the same saved answers, free.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Megaphone, ShieldCheck } from "lucide-react";
import { Badge, Button } from "@ai-matrx/design-system/controls";
import { ToolActionApprovalDialog } from "@ai-matrx/chat/action-requests/hooks/useToolAction";
import type { ScreenRunApproval } from "@ai-matrx/chat/action-requests/screen-run";
import { isCallRunning, type CatalogToolHit, type ToolCallView } from "@ai-matrx/agents/tools";

import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";
import { ToolResult } from "@/features/data-sources/library/tools/ToolResult";
import { useToolCall, type ToolCallState } from "@/features/data-sources/library/tools/useToolCall";

import { authorityTiles, bandOf, type AuthorityKey, type AuthorityTile, type MatrxTileFrom } from "./authority";
import { formatTile, linkTiles, searchTiles, type StatTile } from "./summaries";
import type { SeoTools } from "./seoTools";

type RunKey = AuthorityKey | "links" | "linkRows";
const CALL_PARAM: Record<RunKey, string> = { authority: "ca", matrx: "cm", links: "cl", searchAds: "cs", linkRows: "cr" };

function pin(key: RunKey, callId: string) {
  const next = new URLSearchParams(window.location.search);
  next.set(CALL_PARAM[key], callId);
  replaceAddressWithoutNavigating(`${window.location.pathname}?${next.toString()}`);
}

/** One Tool of this screen: its durable call, resumed from the address when the page reopens. */
function useSeoRun(key: RunKey, hit: CatalogToolHit | undefined): ToolCallState {
  const params = useSearchParams();
  const call = useToolCall(hit?.tool_id ?? "", (callId) => pin(key, callId));
  const resumed = useRef(false);
  const saved = params.get(CALL_PARAM[key]);
  useEffect(() => {
    if (resumed.current || !saved || !hit) return;
    resumed.current = true;
    call.resume(saved);
  });
  return call;
}

function ApprovalGate({ call, host }: { call: ToolCallState; host: string }) {
  const approval = call.view?.status === "needs_approval" ? (call.view.approval as ScreenRunApproval | null) : null;
  if (!approval) return null;
  return (
    <ToolActionApprovalDialog
      approval={approval}
      onSettled={(answer) => {
        if (answer.spendApprovalId) void call.run({ domain: host }, {}, answer.spendApprovalId);
        else call.clear();
      }}
    />
  );
}

export function WebsiteCheck({ host, tools }: { host: string; tools: SeoTools }) {
  const authority = useSeoRun("authority", tools.authority);
  const matrx = useSeoRun("matrx", tools.authorityScore);
  // The compare job's "Matrx" call is only safe once the server says the Tool has compare sources.
  const compareReady = Boolean((tools.authorityScore as unknown as { compare_sources?: unknown[] } | undefined)?.compare_sources?.length);
  const matrxFrom: MatrxTileFrom = compareReady ? "authority_score" : "backlinks_rank";
  const links = useSeoRun("links", tools.links);
  const searchAds = useSeoRun("searchAds", tools.searchAds);
  const linkRows = useSeoRun("linkRows", tools.linkRows);
  const [detail, setDetail] = useState(false);

  const inputs = { domain: host };
  const checks = [authority, ...(compareReady ? [matrx] : []), links, searchAds];
  const busy = checks.some((c) => c.view != null && isCallRunning(c.view.status));
  const everyTool = Boolean(tools.authority && tools.links && tools.searchAds);
  const asked = checks.some((c) => c.view != null || c.clientError != null);

  const runAll = () => {
    if (tools.authority) void authority.run(inputs);
    if (compareReady && tools.authorityScore) void matrx.run(inputs);
    if (tools.links) void links.run(inputs);
    if (tools.searchAds) void searchAds.run(inputs);
  };

  const tiles = authorityTiles(
    { authority: authority.view, matrx: matrx.view, links: links.view, searchAds: searchAds.view },
    { authority: authority.clientError, matrx: matrx.clientError, links: links.clientError, searchAds: searchAds.clientError },
    matrxFrom,
  );

  return (
    <div className="flex flex-col gap-6 sm:gap-8" data-website-check={host}>
      <section aria-label="Check this website" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[12rem] flex-1">
          <div className="break-all text-base font-semibold text-foreground">{host}</div>
          <div className="text-xs text-muted-foreground">Authority, backlinks, search and ads</div>
        </div>
        <Button
          variant="primary"
          disabled={!everyTool || busy}
          onClick={runAll}
          data-check-button=""
        >
          {asked ? "Check again" : "Check website"}
        </Button>
      </section>

      <AuthorityRow tiles={tiles} tools={tools} compareReady={compareReady} onRetry={(key) => void { authority, matrx: compareReady ? matrx : links, searchAds }[key].run(inputs)} />

      <Panel
        icon={<Link2 className="h-4 w-4" />}
        title="Backlinks"
        action={
          tools.linkRows ? (
            <Button
              variant="outline"
              disabled={linkRows.view != null && isCallRunning(linkRows.view.status)}
              onClick={() => void linkRows.run(inputs)}
              data-links-button=""
            >
              {linkRows.view ? "List again" : "See the links"}
            </Button>
          ) : null
        }
      >
        <Glance call={links} inputs={inputs} idle="Press Check website to count the links to this site." tiles={linkTiles} />
        {linkRows.view || linkRows.clientError ? <Answer call={linkRows} inputs={inputs} idle="" /> : null}
      </Panel>

      <Panel icon={<Megaphone className="h-4 w-4" />} title="Search and ads">
        <Glance call={searchAds} inputs={inputs} idle="Press Check website for last month's visits and ad budget." tiles={searchTiles} />
      </Panel>

      {authority.view?.status === "succeeded" ? (
        <Panel icon={<ShieldCheck className="h-4 w-4" />} title="Authority details">
          {detail ? (
            <Answer call={authority} inputs={inputs} idle="" />
          ) : (
            <Button variant="quiet" className="self-start" onClick={() => setDetail(true)}>
              Show the details
            </Button>
          )}
        </Panel>
      ) : null}

      <ApprovalGate call={authority} host={host} />
      <ApprovalGate call={matrx} host={host} />
      <ApprovalGate call={links} host={host} />
      <ApprovalGate call={searchAds} host={host} />
      <ApprovalGate call={linkRows} host={host} />
    </div>
  );
}

function Panel({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span className="text-muted-foreground" aria-hidden>
          {icon}
        </span>
        <h2 className="whitespace-nowrap text-sm font-semibold text-foreground">{title}</h2>
        <span className="ml-auto">{action}</span>
      </div>
      {children}
    </section>
  );
}

/** One Tool's answer inside a panel: nothing yet, or the same viewer the Tools home uses. */
function Answer({ call, inputs, idle }: { call: ToolCallState; inputs: Record<string, unknown>; idle: string }) {
  if (!call.view && !call.clientError) {
    return idle ? <p className="text-sm text-muted-foreground">{idle}</p> : null;
  }
  return (
    <ToolResult
      view={call.view as ToolCallView | null}
      clientError={call.clientError}
      onRunAgain={() => void call.run(inputs)}
      onCancel={call.stop}
    />
  );
}

/** A finished answer as a few big numbers, its whole kind one press away; anything else is the Tools home's own states. */
function Glance({
  call,
  inputs,
  idle,
  tiles,
}: {
  call: ToolCallState;
  inputs: Record<string, unknown>;
  idle: string;
  tiles: (output: unknown) => StatTile[];
}) {
  const [open, setOpen] = useState(false);
  if (call.view?.status !== "succeeded") return <Answer call={call} inputs={inputs} idle={idle} />;
  const stats = tiles(call.view.output);
  return (
    <div className="flex flex-col gap-3">
      {stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-glance="">
          {stats.map((tile) => (
            <div key={tile.label} className="flex flex-col rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-2xl font-semibold tabular-nums text-foreground">{formatTile(tile)}</span>
              <span className="text-xs text-muted-foreground">{tile.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {open ? (
        <Answer call={call} inputs={inputs} idle="" />
      ) : (
        <Button variant="quiet" className="self-start" onClick={() => setOpen(true)}>
          Show the details
        </Button>
      )}
    </div>
  );
}

function AuthorityRow({
  tiles,
  tools,
  compareReady,
  onRetry,
}: {
  tiles: AuthorityTile[];
  tools: SeoTools;
  compareReady: boolean;
  onRetry: (key: AuthorityKey) => void;
}) {
  const price = (key: AuthorityKey) =>
    key === "authority" ? tools.authority : key === "matrx" ? (compareReady ? tools.authorityScore : tools.links) : tools.searchAds;
  return (
    <section aria-label="Authority" className="grid gap-3 sm:grid-cols-3">
      {tiles.map((tile) => (
        <AuthorityCard key={tile.key} tile={tile} hint={price(tile.key)} onRetry={() => onRetry(tile.key)} />
      ))}
    </section>
  );
}

function AuthorityCard({ tile, hint, onRetry }: { tile: AuthorityTile; hint?: CatalogToolHit; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4" data-authority-tile={tile.key} data-status={tile.status}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{tile.label}</span>
        <Badge tone="neutral">{tile.source}</Badge>
      </div>
      {tile.status === "ready" && tile.score != null ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-semibold tabular-nums leading-none text-foreground" data-authority-score="">
              {Math.round(tile.score)}
            </span>
            <span className="text-sm text-muted-foreground">out of 100</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full rounded-full bg-primary" style={{ width: `${tile.score}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{bandOf(tile.score)}</span>
            {tile.saved ? <span>Saved answer</span> : null}
          </div>
        </>
      ) : tile.status === "running" ? (
        <div className="flex flex-col gap-2" aria-label="Checking">
          <div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-1.5 animate-pulse rounded-full bg-muted" />
          <span className="text-xs text-muted-foreground">{tile.note ?? "Checking"}</span>
        </div>
      ) : tile.status === "idle" ? (
        <div className="flex flex-col gap-2">
          <span className="text-4xl font-semibold leading-none text-disabled-foreground">—</span>
          <span className="text-xs text-muted-foreground">{hint ? "Not checked yet" : "Not available right now"}</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm text-foreground">{tile.note}</span>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span />
            {tile.status === "failed" ? (
              <Button variant="quiet" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
