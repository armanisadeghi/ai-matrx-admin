"use client";

/**
 * EVERYTHING ONE TRANSLATION CELL CARRIES, for the admin deciding on it — the
 * ONE renderer shared by the /approvals row (kind `settings_translation`) and the
 * grid's cell editor (Arman, 2026-10-18: "for an admin item you cannot ever hide
 * those things … the actual chat should be one click away … a way to quickly do
 * a test").
 *
 * Nothing is collapsed: who proposed it, confidence against the auto-accept
 * threshold (read at PLATFORM scope, as the database gate reads it), whether a
 * passing live test proves it, the full rationale, the rule in words and as
 * stored, every evidence entry in whatever shape it was stored, conflict,
 * rejection fingerprint, created/updated/approved stamps with the people, every
 * metadata key, the drafting run's chat (or one line saying none was recorded),
 * and Test now (POST /admin/ai-catalog/translation-cells/{id}/test) with each
 * outcome's wire, provider message and stored conversation. No money is shown
 * here (law 14: runs and results never show points or dollars).
 *
 * The last test reply is kept in the query cache under the cell's id, outside the
 * grid prefix, so it survives the refetch the test triggers; when the test moves
 * the cell out of "Needs you" (the /approvals row unmounts) a toast says where it
 * went, with a door to the grid. Pure logic: ../cellDetail.ts.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { RecordId } from "@ai-matrx/design-system";
import { Badge, Button, PropertyRow } from "@ai-matrx/design-system/controls";
import type { BadgeTone } from "@ai-matrx/design-system/controls";
import { formatAbsoluteDate } from "@ai-matrx/kit/format";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { useServerOrganizationId } from "@/lib/api/useServerOrganizationId";
import { adminTwinHref } from "@/features/scopes/registry/adminTwins";
import { openFromNotice } from "@/lib/notice-open/openFromNotice";
import { recordToast, toast } from "@/lib/toast";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { readConfidenceThreshold, readTranslationCellDetail } from "../data";
import {
  TRANSLATION_GRID_QUERY_KEY,
  evidenceProven,
  jsonEqual,
  leftNeedsYou,
  proofCurrent,
  replacedRule,
  isHttpUrl,
  normalizeEvidence,
  otherMetadata,
  readRun,
  sourceLabel,
  testErrorSentence,
  testTranslationCell,
  translationTestResultKey,
  type CellTestOutcome,
  type CellTestResult,
  type EvidenceView,
} from "../cellDetail";
import { summarizeRule } from "../model";
import type { TranslationCellRow } from "../types";

const GRID_HREF = "/administration/ai/ai-models/translations";

function when(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatAbsoluteDate(d);
}

/** Raw data as one wrapped mono line — fully visible, never behind a click. */
function rawText(v: unknown): string {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

/** One key/value of any shape: text as text, everything else as raw data. */
function AnyRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <PropertyRow label={label} missing="Empty" />;
  }
  if (typeof value === "string")
    return <PropertyRow label={label} value={value} />;
  return <PropertyRow label={label} mono value={rawText(value)} />;
}

/** A stored conversation: ONE door (the admin conversation route), new tab, copyable id. */
function ChatDoor({ conversationId }: { conversationId: string }) {
  const href =
    adminTwinHref("conversation", conversationId, true) ??
    `/chat/${conversationId}`;
  return <RecordId value={conversationId} label="Chat" labelled href={href} />;
}

function RefValue({ value }: { value: unknown }) {
  if (isHttpUrl(value)) {
    return (
      <OutboundLink
        href={value}
        className="break-all text-primary underline-offset-2 hover:underline"
      >
        {value}
      </OutboundLink>
    );
  }
  return <>{rawText(value)}</>;
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

const WRITER_LABEL: Record<string, string> = {
  probe: "Server live test",
  agent: "Drafting agent",
  ingest: "Provider catalog",
  migration: "Code change",
};

function EvidenceEntry({
  entry,
  index,
  currentRule,
}: {
  entry: EvidenceView;
  index: number;
  currentRule: unknown;
}) {
  // the door's stamps: who wrote the entry, and the rule it was written about
  const by = entry.extra.find(([k]) => k === "by")?.[1];
  const forRule = entry.extra.find(([k]) => k === "for_rule");
  const sameRule = forRule ? jsonEqual(forRule[1], currentRule) : null;
  const rest = entry.extra.filter(
    ([k]) => k !== "by" && !(k === "for_rule" && sameRule),
  );
  return (
    <div
      className="space-y-0.5 border-l-2 border-border pl-3"
      data-testid="translation-evidence-entry"
    >
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="type-secondary text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        {entry.kind ? (
          <Badge tone="info">{entry.kind}</Badge>
        ) : (
          <Badge tone="warning">No kind</Badge>
        )}
        {entry.outcome ? (
          <Badge tone={OUTCOME_TONE[entry.outcome] ?? "neutral"}>
            {entry.outcome}
          </Badge>
        ) : null}
        {entry.at ? (
          <span className="type-secondary text-muted-foreground">
            {when(entry.at)}
          </span>
        ) : null}
      </div>
      {entry.ref !== undefined ? (
        <PropertyRow
          label="Ref"
          mono={!isHttpUrl(entry.ref)}
          value={
            entry.ref === null || entry.ref === "" ? null : (
              <RefValue value={entry.ref} />
            )
          }
          {...(entry.ref === null || entry.ref === ""
            ? { missing: "Empty" }
            : {})}
        />
      ) : null}
      {entry.result !== undefined ? (
        <AnyRow label="Result" value={entry.result} />
      ) : null}
      {entry.conversationId ? (
        <PropertyRow
          label="Test call"
          value={<ChatDoor conversationId={entry.conversationId} />}
        />
      ) : null}
      {by !== undefined ? (
        <PropertyRow
          label="Written by"
          value={
            typeof by === "string"
              ? (WRITER_LABEL[by] ?? by)
              : JSON.stringify(by)
          }
        />
      ) : null}
      {sameRule !== null ? (
        <PropertyRow
          label="Tested rule"
          value={
            sameRule ? (
              "This rule"
            ) : (
              <Badge tone="warning">An earlier rule (shown below)</Badge>
            )
          }
        />
      ) : null}
      {rest.map(([k, v]) => (
        <AnyRow
          key={k}
          label={k === "for_rule" ? "Earlier rule" : k}
          value={v}
        />
      ))}
    </div>
  );
}

function OutcomeEntry({ o }: { o: CellTestOutcome }) {
  return (
    <div
      className="space-y-0.5 border-l-2 border-border pl-3"
      data-testid="translation-test-outcome"
    >
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {o.outcome ? (
          <Badge tone={OUTCOME_TONE[o.outcome] ?? "neutral"}>{o.outcome}</Badge>
        ) : (
          <Badge tone="warning">No outcome</Badge>
        )}
        <span className="type-value font-medium">
          {o.label ?? rawText(o.value)}
        </span>
        <span className="type-secondary text-muted-foreground">
          {[o.model_name, o.api].filter(Boolean).join(" · ")}
        </span>
      </div>
      <AnyRow label="Sent on the wire" value={o.wire} />
      <PropertyRow
        label="Provider said"
        value={o.provider_message}
        {...(o.provider_message ? {} : { missing: "Nothing" })}
        {...(o.provider_param ? { meta: o.provider_param } : {})}
      />
      {o.detail ? <PropertyRow label="Detail" value={o.detail} /> : null}
      <PropertyRow
        label="Call"
        value={
          o.conversation_id ? (
            <ChatDoor conversationId={o.conversation_id} />
          ) : null
        }
        {...(o.conversation_id ? {} : { missing: "Not stored" })}
      />
    </div>
  );
}

function TestResultView({ result }: { result: CellTestResult }) {
  const b = result.budget;
  return (
    <div className="space-y-1" data-testid="translation-test-result">
      <PropertyRow
        label="Last test"
        value={result.summary}
        {...(result.summary ? {} : { missing: "No summary" })}
        {...(b && b.used_last_24h != null && b.per_day != null
          ? { meta: `${b.used_last_24h}/${b.per_day} tests today` }
          : {})}
      />
      {result.stopped_by_budget ? (
        <p className="type-secondary text-warning">
          Stopped early: the daily test budget ran out.
        </p>
      ) : null}
      {result.problems.length > 0 ? (
        <>
          <p className="break-words type-secondary font-medium text-warning">
            {result.problems.join(" ")}{" "}
            <ErrorAlchemyMenu error={result.problems.join(" ")} />
          </p>
          <PropertyRow
            label="Reply as received"
            mono
            value={rawText(result.raw)}
          />
        </>
      ) : null}
      {result.outcomes.map((o, i) => (
        <OutcomeEntry
          key={`${o.offering_id ?? "?"}:${o.label ?? "?"}:${i}`}
          o={o}
        />
      ))}
      {result.outcomes.length === 0 && result.problems.length === 0 ? (
        <p className="type-secondary text-muted-foreground">
          No calls were made.
        </p>
      ) : null}
    </div>
  );
}

function TestNow({ cell }: { cell: TranslationCellRow }) {
  const queryClient = useQueryClient();
  const auth = {
    accessToken: useAppSelector(selectAccessToken) ?? null,
    baseUrl: useAppSelector(selectResolvedBaseUrl) ?? null,
    organizationId: useServerOrganizationId(),
  };
  const kept = useQuery<CellTestResult | null>({
    queryKey: translationTestResultKey(cell.id),
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  });
  const result = kept.data ?? null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const reply = await testTranslationCell(auth, cell.id);
      queryClient.setQueryData(translationTestResultKey(cell.id), reply);
      toast.success("Test finished", {
        description: reply.summary ?? "The reply had no summary.",
      });
      // The server appends evidence and may promote the state: refetch, then say
      // where the cell went when it left "Needs you" (its /approvals row unmounts).
      await queryClient.invalidateQueries({
        queryKey: TRANSLATION_GRID_QUERY_KEY,
      });
      const fresh = await readTranslationCellDetail(cell.id).catch(() => null);
      if (fresh && leftNeedsYou(cell, fresh)) {
        recordToast.info(
          { type: "translation_cell", id: cell.id, title: cell.setting_key },
          `${cell.setting_key} is now ${fresh.state}`,
          {
            description: reply.summary ?? undefined,
            action: {
              label: "Open grid",
              onClick: () => openFromNotice(`${GRID_HREF}?tab=all`),
            },
          },
        );
      }
    } catch (err) {
      setError(testErrorSentence(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        icon={<FlaskConical />}
        variant="outline"
        disabled={busy}
        onClick={() => void run()}
      >
        {busy ? "Testing…" : "Test now"}
      </Button>
      {error ? (
        <p
          className="break-words type-secondary font-medium text-destructive"
          data-testid="translation-test-error"
        >
          {error} <ErrorAlchemyMenu error={error} />
        </p>
      ) : null}
      {result ? <TestResultView result={result} /> : null}
    </div>
  );
}

function ConfidenceValue({ confidence }: { confidence: number }) {
  const threshold = useQuery({
    queryKey: ["ai-models", "translation-confidence-threshold"],
    queryFn: readConfidenceThreshold,
    staleTime: 60_000,
    retry: false,
  });
  const pct = Math.round(confidence * 100);
  return (
    <span
      className="inline-flex flex-wrap items-center gap-2"
      data-testid="translation-confidence"
    >
      <span className="tabular-nums">{pct}%</span>
      {threshold.isPending ? (
        <span className="type-secondary text-muted-foreground">
          Reading the threshold…
        </span>
      ) : threshold.isError ? (
        <span className="type-secondary text-destructive">
          Could not read the threshold{" "}
          <ErrorAlchemyMenu error={threshold.error} />
        </span>
      ) : (
        <>
          <span className="type-secondary text-muted-foreground tabular-nums">
            threshold {Math.round(threshold.data * 100)}%
          </span>
          {confidence < threshold.data ? (
            <Badge tone="warning">Below threshold</Badge>
          ) : (
            <Badge tone="success">Meets threshold</Badge>
          )}
        </>
      )}
    </span>
  );
}

function PersonAt({
  at,
  by,
  label,
}: {
  at: string | null | undefined;
  by: string | null | undefined;
  label: string;
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {when(at) ?? null}
      {by ? <RecordId value={by} label={label} labelled token="user" /> : null}
    </span>
  );
}

export default function CellDetailPanel({
  cell,
  showSource = true,
}: {
  cell: TranslationCellRow;
  /** False where the host already prints who proposed it (the /approvals row). */
  showSource?: boolean;
}) {
  const detailQuery = useQuery({
    queryKey: [...TRANSLATION_GRID_QUERY_KEY, "cell-detail", cell.id],
    queryFn: () => readTranslationCellDetail(cell.id),
    staleTime: 30_000,
  });
  const detail = detailQuery.data ?? null;
  const reading = !detail && !detailQuery.isError;
  const evidence = normalizeEvidence(detail?.evidence);
  const currentRule = detail ? detail.rule : cell.rule;
  const proven = detail ? proofCurrent(detail.evidence, currentRule) : null;
  // passing tests on record that the door no longer counts (an earlier rule, or not server-run)
  const staleProof = detail
    ? !proven && evidenceProven(detail.evidence)
    : false;
  const run = detail ? readRun(detail.metadata) : null;
  const replaced = replacedRule({
    ...cell,
    metadata: (detail?.metadata ??
      cell.metadata) as TranslationCellRow["metadata"],
  });
  const metadataRest = detail ? otherMetadata(detail.metadata) : [];
  const detailError = detailQuery.isError ? (
    <span className="text-destructive">
      Could not read this cell <ErrorAlchemyMenu error={detailQuery.error} />
    </span>
  ) : null;

  return (
    <div className="min-w-0 space-y-3" data-testid="translation-cell-detail">
      {showSource ? (
        <PropertyRow
          label="Proposed by"
          value={sourceLabel(cell.source)}
          {...(cell.source ? {} : { missing: "Unknown" })}
        />
      ) : null}
      <PropertyRow
        label="Confidence"
        help="Agent drafts at or above the threshold apply without review."
        value={
          cell.confidence != null ? (
            <ConfidenceValue confidence={cell.confidence} />
          ) : null
        }
        {...(cell.confidence != null ? {} : { missing: "Not given" })}
      />
      <PropertyRow
        label="Live test"
        value={
          detailError ??
          (proven === null ? (
            "Reading…"
          ) : proven ? (
            <Badge tone="success">Proven by a live test of this rule</Badge>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge tone="warning">Not proven by a live test</Badge>
              {staleProof ? (
                <span className="text-muted-foreground">
                  Passing tests on record are for an earlier rule or not
                  server-run
                </span>
              ) : null}
            </span>
          ))
        }
      />
      {replaced ? (
        <PropertyRow
          label="Rule this draft replaced"
          help="Reject restores it."
          value={summarizeRule(replaced.rule as TranslationCellRow["rule"])}
          expanded={
            <AnyRow label="Replaced rule as stored" value={replaced.rule} />
          }
          defaultOpen
        />
      ) : null}
      <PropertyRow
        label="Agent run"
        value={
          detailError ??
          (reading ? (
            "Reading…"
          ) : run?.conversation_id ? (
            <ChatDoor conversationId={run.conversation_id} />
          ) : run ? (
            "Run recorded without a chat id"
          ) : (
            "No agent run recorded for this draft"
          ))
        }
      />
      {run ? (
        <div className="space-y-0.5 border-l-2 border-border pl-3">
          {run.request_id ? (
            <PropertyRow label="Request" mono value={run.request_id} />
          ) : null}
          {run.agent_id ? (
            <PropertyRow
              label="Agent"
              value={
                <RecordId value={run.agent_id} label="Agent" token="agent" />
              }
            />
          ) : null}
          {run.model_id ? (
            <PropertyRow label="Model" mono value={run.model_id} />
          ) : null}
          {run.mandate_key ? (
            <PropertyRow label="Mandate" mono value={run.mandate_key} />
          ) : null}
          {run.at ? <PropertyRow label="Ran" value={when(run.at)} /> : null}
          {run.extra.map(([k, v]) => (
            <AnyRow key={k} label={k} value={v} />
          ))}
        </div>
      ) : null}
      <TestNow cell={cell} />
      <PropertyRow
        label="Rationale"
        value={
          cell.rationale ? (
            <span className="whitespace-pre-wrap break-words">
              {cell.rationale}
            </span>
          ) : null
        }
        {...(cell.rationale ? {} : { missing: "None given" })}
      />
      <PropertyRow label="Rule" value={summarizeRule(cell.rule)} />
      <PropertyRow label="Rule as stored" mono value={rawText(cell.rule)} />
      <PropertyRow
        label="Evidence"
        value={
          detailError ??
          (reading
            ? "Reading…"
            : evidence.length === 0
              ? null
              : evidence.length === 1
                ? "1 entry"
                : `${evidence.length} entries`)
        }
        {...(detail && evidence.length === 0 ? { missing: "None" } : {})}
      />
      {evidence.length > 0 ? (
        <div className="space-y-2">
          {evidence.map((e, i) => (
            <EvidenceEntry
              key={i}
              entry={e}
              index={i}
              currentRule={currentRule}
            />
          ))}
        </div>
      ) : null}
      {cell.conflict ? (
        <>
          <PropertyRow
            label="Conflict"
            value="Sources disagree"
            {...(cell.conflict.at ? { meta: when(cell.conflict.at) } : {})}
          />
          <div className="space-y-2">
            {(cell.conflict.sources ?? []).map((s, i) => (
              <div
                key={i}
                className="space-y-0.5 border-l-2 border-border pl-3"
              >
                <PropertyRow
                  label={s.name ?? `Source ${i + 1}`}
                  mono
                  value={rawText(s.says)}
                  {...(s.confidence != null
                    ? { meta: `${Math.round(s.confidence * 100)}%` }
                    : {})}
                />
                {s.rationale ? (
                  <PropertyRow label="Why" value={s.rationale} />
                ) : null}
              </div>
            ))}
            {!cell.conflict.sources?.length ? (
              <PropertyRow
                label="Conflict as stored"
                mono
                value={rawText(cell.conflict)}
              />
            ) : null}
          </div>
        </>
      ) : null}
      {cell.rejection_fingerprint ? (
        <PropertyRow
          label="Provider rejection"
          mono
          value={cell.rejection_fingerprint}
        />
      ) : null}
      {metadataRest.map(([k, v]) => (
        <AnyRow key={k} label={`Metadata: ${k}`} value={v} />
      ))}
      <PropertyRow
        label="Created"
        value={
          detail?.created_at || detail?.created_by ? (
            <PersonAt
              at={detail.created_at}
              by={detail.created_by}
              label="Creator"
            />
          ) : null
        }
        {...(detail?.created_at || detail?.created_by
          ? {}
          : { missing: detail ? "Unknown" : "Reading…" })}
      />
      <PropertyRow
        label="Updated"
        value={
          cell.updated_at || detail?.updated_by ? (
            <PersonAt
              at={cell.updated_at}
              by={detail?.updated_by}
              label="Editor"
            />
          ) : null
        }
        {...(cell.updated_at || detail?.updated_by
          ? {}
          : { missing: "Unknown" })}
      />
      <PropertyRow
        label="Approved"
        value={
          cell.approved_at || cell.approved_by ? (
            <PersonAt
              at={cell.approved_at}
              by={cell.approved_by}
              label="Approver"
            />
          ) : null
        }
        {...(cell.approved_at || cell.approved_by
          ? {}
          : { missing: "Not yet" })}
      />
      <PropertyRow
        label="Cell"
        value={<RecordId value={cell.id} label="Cell" />}
      />
    </div>
  );
}
