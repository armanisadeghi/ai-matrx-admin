"use client";

/**
 * "What the agent receives" on the per-surface admin page (surface declarations W5-C).
 *
 * Calls aidream `POST /admin/surface-evidence/receives` (W6-A; features/surfaces/FEATURE.md
 * § What the agent receives). Default: the blocks composed from the last probe's values
 * (`from_last_check`). A pasted conversation / message / run id shows that sent turn's stored
 * blocks; a block whose text is gone says only its hash was kept. Loads when the section
 * scrolls into view (load law: nothing until engaged).
 */
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, Input, PropertyRow, Select } from "@ai-matrx/design-system/controls";
import { RecordId } from "@ai-matrx/design-system";
import { CopyButtons } from "@/components/agent-copy/CopyButtons";
import { labelFromName } from "@ai-matrx/chat/surfaces/utils/surface-display";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { fetchSurfaceReceives, type SurfaceReceivesResult } from "@/features/admin/surface-evidence/api";
import type { SurfaceReceivesQuery } from "@/features/admin/surface-evidence/types";
import {
  mapReceives,
  type ReceivesBlockView,
  type ReceivesCheckLine,
  type ReceivesIdKind,
} from "@/features/surfaces/utils/receives-view";

const ID_KINDS: { value: ReceivesIdKind; label: string }[] = [
  { value: "conversation_id", label: "Conversation" },
  { value: "message_id", label: "Message" },
  { value: "request_id", label: "Run" },
];

type State =
  | { status: "loading" }
  | { status: "done"; result: SurfaceReceivesResult }
  | { status: "error"; message: string };

type Outcome = { query: SurfaceReceivesQuery; state: State };

function when(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleString() : null;
}

export function SurfaceReceivesSection({ surfaceName }: { surfaceName: string }) {
  const ref = useRef<HTMLElement>(null);
  const [engaged, setEngaged] = useState(false);
  // The page mounts this keyed by the surface name, so a new surface starts fresh.
  const [query, setQuery] = useState<SurfaceReceivesQuery>({ surface: surfaceName, from_last_check: true });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [idKind, setIdKind] = useState<ReceivesIdKind>("conversation_id");
  const [idDraft, setIdDraft] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el || engaged) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setEngaged(true);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [engaged]);

  useEffect(() => {
    if (!engaged) return;
    let alive = true;
    fetchSurfaceReceives(query)
      .then((result) => alive && setOutcome({ query, state: { status: "done", result } }))
      .catch(
        (e: unknown) =>
          alive && setOutcome({ query, state: { status: "error", message: e instanceof Error ? e.message : "Not loaded" } }),
      );
    return () => {
      alive = false;
    };
  }, [engaged, query]);

  const state: State = outcome && outcome.query === query ? outcome.state : { status: "loading" };

  const stored = Boolean(query.conversation_id || query.message_id || query.request_id);
  const showTurn = () => {
    const id = idDraft.trim();
    if (!id) return;
    setEngaged(true);
    setQuery({ [idKind]: id });
  };
  const showProbe = () => {
    setIdDraft("");
    setEngaged(true);
    setQuery({ surface: surfaceName, from_last_check: true });
  };

  return (
    <section ref={ref} className="space-y-2" data-testid="surface-receives">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What the agent receives</h2>
        <Badge variant="outline" className="text-[10px]">
          {stored ? "Sent turn" : "From last probe"}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Id kind"
          value={idKind}
          options={ID_KINDS}
          onValueChange={setIdKind}
          className="w-36"
        />
        {/* ui-exception: a raw id is pasted here, not written */}
        <Input
          mono
          value={idDraft}
          onChange={(e) => setIdDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") showTurn();
          }}
          placeholder="Paste an id"
          aria-label="Conversation, message or run id"
          className="w-80 max-w-full"
          data-testid="surface-receives-id"
        />
        <Button variant="outline" onClick={showTurn} disabled={!idDraft.trim()}>
          Show turn
        </Button>
        {stored && (
          <Button variant="quiet" onClick={showProbe}>
            Back to last probe
          </Button>
        )}
      </div>

      <ReceivesBody state={state} />
    </section>
  );
}

function ReceivesBody({ state }: { state: State }) {
  if (state.status === "loading") {
    return (
      <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading what the agent receives…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive-ink">
        {state.message}
        <ErrorAlchemyMenu error={state.message} />
      </div>
    );
  }
  const { result } = state;
  if (result.kind === "not_deployed") {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground" data-testid="surface-receives-not-deployed">
        Available after the next server release
      </div>
    );
  }
  if (result.kind === "refused") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground" data-testid="surface-receives-refused">
        {result.message}
        <ErrorAlchemyMenu error={result.message} />
      </div>
    );
  }
  const view = mapReceives(result.data, (name) => labelFromName(name));
  return (
    <div className="space-y-3">
      <div className="grid gap-3 rounded-md border border-border bg-card p-3 md:grid-cols-2">
        <div className="space-y-3">
          {view.mode === "stored" ? (
            <>
              <PropertyRow
                label="Conversation"
                value={view.conversationId ? <RecordId value={view.conversationId} label="Conversation" token="conversation" /> : null}
                missing={view.conversationId ? undefined : "None"}
              />
              <PropertyRow
                label="Message"
                value={view.messageId ? <RecordId value={view.messageId} label="Message" /> : null}
                missing={view.messageId ? undefined : "None"}
              />
            </>
          ) : (
            <PropertyRow
              label="Probe values from"
              value={view.noValues ? null : when(view.lastCheckAt)}
              missing={view.noValues ? "No probe recorded values" : view.lastCheckAt ? undefined : "Unknown"}
            />
          )}
          <PropertyRow label="Blocks" value={String(view.blocks.length)} />
        </div>
        <ul className="space-y-1.5" data-testid="surface-receives-checks">
          {view.checks.map((c) => (
            <CheckLine key={c.key} check={c} />
          ))}
        </ul>
      </div>

      {view.blocks.length === 0 ? (
        <div className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">No context blocks</div>
      ) : (
        <ol className="space-y-2" data-testid="surface-receives-blocks">
          {view.blocks.map((b) => (
            <BlockCard key={b.key} block={b} />
          ))}
        </ol>
      )}
    </div>
  );
}

function CheckLine({ check }: { check: ReceivesCheckLine }) {
  const icon =
    check.state === "pass" ? (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
    ) : check.state === "fail" ? (
      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
    ) : (
      <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />
    );
  const word = check.state === "pass" ? "Pass" : check.state === "fail" ? "Fail" : "Not checked";
  return (
    <li className="flex items-start gap-2 text-sm" data-check={check.key} data-state={check.state}>
      {icon}
      <span className="min-w-0">
        <span className="text-foreground">{check.label}</span>
        <span className="text-muted-foreground"> · {word}</span>
        {check.detail && <span className="block truncate text-xs text-muted-foreground">{check.detail}</span>}
      </span>
    </li>
  );
}

function BlockCard({ block }: { block: ReceivesBlockView }) {
  return (
    <li className="rounded-md border border-border bg-card" data-block={block.id}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="text-xs tabular-nums text-muted-foreground">{block.position}</span>
        <span className="text-sm font-medium text-foreground">{block.label}</span>
        {block.chars !== null && (
          <span className="text-xs tabular-nums text-muted-foreground">{block.chars.toLocaleString()} chars</span>
        )}
        {!block.retained && (
          <Badge variant="outline" className="text-[10px]">
            Hash only
          </Badge>
        )}
        <div className="ml-auto">
          {block.text !== null && (
            <CopyButtons size="sm" label={block.label} data={block.text} dataType="Context block" defaultCopy="raw" />
          )}
        </div>
      </div>
      {block.text !== null ? (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs text-foreground">
          {block.text}
        </pre>
      ) : (
        <div className="space-y-1 px-3 py-2 text-sm text-muted-foreground">
          <div>{block.lostNote}</div>
          {block.sha256 && <div className="truncate font-mono text-xs">sha256 {block.sha256}</div>}
        </div>
      )}
    </li>
  );
}
