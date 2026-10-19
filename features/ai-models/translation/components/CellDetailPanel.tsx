"use client";

/**
 * EVERYTHING ONE TRANSLATION CELL CARRIES, for the admin deciding on it — the
 * ONE renderer shared by the /approvals row (kind `settings_translation`) and the
 * grid's cell editor (Arman, 2026-10-18: "for an admin item you cannot ever hide
 * those things … the actual chat should be one click away … a way to quickly do
 * a test").
 *
 * Shows: who proposed it, confidence against the auto-accept knob, whether a
 * passing live test proves it, the full rationale, the rule (summary + raw JSON),
 * every evidence entry in whatever shape it was stored, conflict, rejection
 * fingerprint, created/updated/approved stamps, the drafting run's chat (or one
 * line saying none was recorded), and Test now
 * (POST /admin/ai-catalog/translation-cells/{id}/test) with each outcome's wire,
 * provider message and stored conversation. Pure logic: ../cellDetail.ts.
 */

import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FlaskConical } from "lucide-react";
import { RecordId } from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow } from "@ai-matrx/design-system/controls";
import type { BadgeTone } from "@ai-matrx/design-system/controls";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useEffectiveKnob } from "@/lib/scoped-config/effectiveKnobs.client";
import { adminTwinHref } from "@/features/scopes/registry/adminTwins";
import { toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { readTranslationCellDetail } from "../data";
import {
  TRANSLATION_GRID_QUERY_KEY,
  CONFIDENCE_THRESHOLD_DEFAULT,
  CONFIDENCE_THRESHOLD_KNOB,
  evidenceProven,
  isHttpUrl,
  normalizeEvidence,
  readRun,
  sourceLabel,
  testErrorSentence,
  testTranslationCell,
  type CellTestOutcome,
  type CellTestResult,
  type EvidenceView,
} from "../cellDetail";
import { summarizeRule } from "../model";
import type { TranslationCellRow } from "../types";


function when(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatAbsoluteDate(d);
}

function json(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted px-2 py-1.5 font-mono text-xs text-foreground">
      {children}
    </pre>
  );
}

/** A stored conversation, opened in a new tab through the admin conversation door. */
function ChatLink({ conversationId, label = "Open chat" }: { conversationId: string; label?: string }) {
  const href = adminTwinHref("conversation", conversationId, true) ?? `/chat/${conversationId}`;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button variant="link" iconEnd={<ExternalLink />} asChild>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      </Button>
      <RecordId value={conversationId} label="Chat" href={href} />
    </span>
  );
}

function RefValue({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === "") return null;
  if (isHttpUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-primary underline-offset-2 hover:underline"
      >
        {value}
      </a>
    );
  }
  return typeof value === "string" ? (
    <span className="break-all font-mono text-xs">{value}</span>
  ) : (
    <Mono>{json(value)}</Mono>
  );
}

const OUTCOME_TONE: Record<string, BadgeTone> = {
  accepted: "success",
  pass: "success",
  boundary: "success",
  rejected: "destructive",
  fail: "destructive",
  error: "warning",
  skipped: "neutral",
};

function EvidenceEntry({ entry, index }: { entry: EvidenceView; index: number }) {
  const resultIsText = typeof entry.result === "string";
  return (
    <li className="space-y-1.5 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="type-secondary text-muted-foreground tabular-nums">{index + 1}</span>
        {entry.kind ? <Badge tone="info">{entry.kind}</Badge> : <Badge tone="warning">No kind</Badge>}
        {entry.outcome ? (
          <Badge tone={OUTCOME_TONE[entry.outcome] ?? "neutral"}>{entry.outcome}</Badge>
        ) : null}
        {entry.at ? <span className="type-secondary text-muted-foreground">{when(entry.at)}</span> : null}
      </div>
      {entry.ref !== undefined ? (
        <PropertyRow label="Ref" value={<RefValue value={entry.ref} />} />
      ) : null}
      {entry.result !== undefined ? (
        <PropertyRow
          label="Result"
          value={resultIsText ? (entry.result as string) : <Mono>{json(entry.result)}</Mono>}
        />
      ) : null}
      {entry.conversationId ? (
        <PropertyRow label="Test call" value={<ChatLink conversationId={entry.conversationId} />} />
      ) : null}
      {entry.extra.map(([k, v]) => (
        <PropertyRow
          key={k}
          label={k}
          value={typeof v === "string" ? v : <Mono>{json(v)}</Mono>}
          {...(v === null || v === "" ? { missing: "Empty" } : {})}
        />
      ))}
    </li>
  );
}

function OutcomeRow({ o }: { o: CellTestOutcome }) {
  return (
    <li className="space-y-1.5 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={OUTCOME_TONE[o.outcome] ?? "neutral"}>{o.outcome}</Badge>
        <span className="type-value font-medium">{o.label}</span>
        <span className="type-secondary text-muted-foreground">
          {o.model_name} · {o.api}
        </span>
        {o.cost_usd > 0 ? (
          <span className="ml-auto type-secondary text-muted-foreground tabular-nums">
            ${o.cost_usd.toFixed(4)}
          </span>
        ) : null}
      </div>
      <PropertyRow label="Sent on the wire" value={<Mono>{json(o.wire)}</Mono>} />
      <PropertyRow
        label="Provider said"
        value={o.provider_message}
        {...(o.provider_message ? {} : { missing: "Nothing" })}
        {...(o.provider_param ? { meta: o.provider_param } : {})}
      />
      {o.detail ? <PropertyRow label="Detail" value={o.detail} /> : null}
      <PropertyRow
        label="Call"
        value={o.conversation_id ? <ChatLink conversationId={o.conversation_id} /> : null}
        {...(o.conversation_id ? {} : { missing: "Not stored" })}
      />
    </li>
  );
}

function TestNow({ cellId }: { cellId: string }) {
  const queryClient = useQueryClient();
  const auth = {
    accessToken: useAppSelector(selectAccessToken) ?? null,
    baseUrl: useAppSelector(selectResolvedBaseUrl) ?? null,
    organizationId: useServerOrganizationId(),
  };
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CellTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const reply = await testTranslationCell(auth, cellId);
      setResult(reply);
      toast.success("Test finished", { description: reply.summary });
      // The server appends evidence and may promote the state.
      void queryClient.invalidateQueries({ queryKey: TRANSLATION_GRID_QUERY_KEY });
    } catch (err) {
      setResult(null);
      setError(testErrorSentence(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button icon={<FlaskConical />} variant="outline" disabled={busy} onClick={() => void run()}>
          {busy ? "Testing…" : "Test now"}
        </Button>
        {result ? (
          <span className="type-secondary text-muted-foreground">
            {result.tested_offerings === 1 ? "1 model" : `${result.tested_offerings} models`} ·{" "}
            {result.budget.used_last_24h}/{result.budget.per_day} tests today
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="break-words type-secondary font-medium text-destructive">
          {error} <ErrorAlchemyMenu error={error} />
        </p>
      ) : null}
      {result ? (
        <div className="space-y-1">
          <p className="break-words type-value">{result.summary}</p>
          {result.stopped_by_budget ? (
            <p className="type-secondary text-warning">Stopped early: the daily test budget ran out.</p>
          ) : null}
          {result.outcomes.length > 0 ? (
            <ul>
              {result.outcomes.map((o, i) => (
                <OutcomeRow key={`${o.offering_id}:${o.label}:${i}`} o={o} />
              ))}
            </ul>
          ) : (
            <p className="type-secondary text-muted-foreground">No calls were made.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function CellDetailPanel({ cell }: { cell: TranslationCellRow }) {
  const userId = useAppSelector(selectUserId);
  const orgId = useAppSelector(selectOrganizationId);
  const knob = useEffectiveKnob(orgId, userId, CONFIDENCE_THRESHOLD_KNOB);
  const threshold = typeof knob === "number" ? knob : Number(knob ?? NaN);
  const thresholdKnown = Number.isFinite(threshold);
  const shownThreshold = thresholdKnown ? threshold : CONFIDENCE_THRESHOLD_DEFAULT;

  const detailQuery = useQuery({
    queryKey: [...TRANSLATION_GRID_QUERY_KEY, "cell-detail", cell.id],
    queryFn: () => readTranslationCellDetail(cell.id),
    staleTime: 30_000,
  });
  const detail = detailQuery.data ?? null;
  const evidence = normalizeEvidence(detail?.evidence);
  const proven = detail ? evidenceProven(detail.evidence) : null;
  const run = detail ? readRun(detail.metadata) : null;
  const pct = cell.confidence != null ? Math.round(cell.confidence * 100) : null;
  const below = cell.confidence != null && cell.confidence < shownThreshold;

  return (
    <div className="min-w-0 space-y-3" data-testid="translation-cell-detail">
      <PropertyRow
        label="Proposed by"
        value={sourceLabel(cell.source)}
        {...(cell.source ? {} : { missing: "Unknown" })}
      />
      <PropertyRow
        label="Confidence"
        help="Agent drafts at or above the threshold apply without review."
        value={
          pct != null ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="tabular-nums">{pct}%</span>
              <span className="type-secondary text-muted-foreground tabular-nums">
                threshold {Math.round(shownThreshold * 100)}%{thresholdKnown ? "" : " (default)"}
              </span>
              {below ? <Badge tone="warning">Below threshold</Badge> : <Badge tone="success">Meets threshold</Badge>}
            </span>
          ) : null
        }
        {...(pct != null ? {} : { missing: "Not given" })}
      />
      <PropertyRow
        label="Live test"
        value={
          proven === null ? (
            detailQuery.isError ? (
              <span className="text-destructive">
                Could not read the evidence <ErrorAlchemyMenu error={detailQuery.error} />
              </span>
            ) : (
              <span className="text-muted-foreground">Reading…</span>
            )
          ) : proven ? (
            <Badge tone="success">Proven by a passing live test</Badge>
          ) : (
            <Badge tone="warning">Not proven by a live test</Badge>
          )
        }
      />
      <PropertyRow
        label="Agent run"
        value={
          run?.conversation_id ? (
            <ChatLink conversationId={run.conversation_id} />
          ) : detail ? (
            run ? (
              "Run recorded without a chat id"
            ) : (
              "No agent run recorded for this draft"
            )
          ) : null
        }
        {...(detail || detailQuery.isError ? {} : { missing: "Reading…" })}
        {...(run
          ? {
              expanded: <Mono>{json(run)}</Mono>,
            }
          : {})}
      />
      <TestNow cellId={cell.id} />
      <PropertyRow
        label="Rationale"
        value={cell.rationale ? <span className="whitespace-pre-wrap break-words">{cell.rationale}</span> : null}
        {...(cell.rationale ? {} : { missing: "None given" })}
      />
      <PropertyRow
        label="Rule"
        value={summarizeRule(cell.rule)}
        expanded={<Mono>{json(cell.rule)}</Mono>}
      />
      <PropertyRow
        label="Evidence"
        data={detail?.evidence ?? []}
        value={
          detailQuery.isError
            ? "Could not read the evidence"
            : !detail
              ? "Reading…"
              : evidence.length === 0
                ? null
                : evidence.length === 1
                  ? "1 entry"
                  : `${evidence.length} entries`
        }
        {...(detail && evidence.length === 0 ? { missing: "None" } : {})}
        {...(evidence.length > 0
          ? {
              expanded: (
                <ul>
                  {evidence.map((e, i) => (
                    <EvidenceEntry key={i} entry={e} index={i} />
                  ))}
                </ul>
              ),
            }
          : {})}
      />
      {cell.conflict ? (
        <PropertyRow
          label="Conflict"
          value={
            cell.conflict.sources?.length ? (
              <ul className="space-y-1">
                {cell.conflict.sources.map((s, i) => (
                  <li key={i} className="space-y-0.5">
                    <span className="font-medium">{s.name ?? "Source"}</span>
                    {s.confidence != null ? (
                      <span className="type-secondary text-muted-foreground tabular-nums">
                        {" "}
                        {Math.round(s.confidence * 100)}%
                      </span>
                    ) : null}
                    <Mono>{json(s.says)}</Mono>
                    {s.rationale ? <p className="type-secondary">{s.rationale}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Mono>{json(cell.conflict)}</Mono>
            )
          }
          {...(cell.conflict.at ? { meta: when(cell.conflict.at) } : {})}
        />
      ) : null}
      {cell.rejection_fingerprint ? (
        <PropertyRow label="Provider rejection" mono value={cell.rejection_fingerprint} />
      ) : null}
      <PropertyRow label="Created" value={when(detail?.created_at)} {...(detail?.created_at ? {} : { missing: detail ? "Unknown" : "Reading…" })} />
      <PropertyRow label="Updated" value={when(cell.updated_at)} {...(cell.updated_at ? {} : { missing: "Unknown" })} />
      <PropertyRow
        label="Approved"
        value={
          cell.approved_at || cell.approved_by ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              {when(cell.approved_at)}
              {cell.approved_by ? <RecordId value={cell.approved_by} label="Approver" token="user" /> : null}
            </span>
          ) : null
        }
        {...(cell.approved_at || cell.approved_by ? {} : { missing: "Not yet" })}
      />
      <PropertyRow label="Cell" value={<RecordId value={cell.id} label="Cell" />} />
    </div>
  );
}
