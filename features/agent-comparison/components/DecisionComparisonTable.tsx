"use client";

/**
 * DecisionComparisonTable — question × agent, with the judge's verdict.
 *
 * Two agents answering the same questions is the one comparison a battle can
 * settle objectively, and it is the one a scroll of two message columns makes
 * impossible: the answers are ten lines apart, the probabilities are in
 * different places, and the question that actually split them is invisible.
 * So: one row per question, one cell per agent (answer + probability), a
 * DELTA column that says how far apart they are, and a verdict column where
 * the judge writes what was actually true.
 *
 * The verdict is the point. Without recorded ground truth, a battle produces
 * a preference; with it, a battle produces calibration data for every agent
 * version that answered.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Badge, Input } from "@ai-matrx/design-system/controls";
import {
  MatrxComparisonTable,
  type ComparisonExtraColumn,
  type ComparisonRow,
  type ComparisonSubject,
} from "@ai-matrx/design-system/data-table";
import { TableSaveToMenu } from "@ai-matrx/rich-content/display/tables/TableSaveToMenu";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/lib/redux/hooks";
import { useCatalogBoundSelector } from "../shared/useCatalogBoundSelector";
import { labelConversations } from "@/features/agents/decision-review/service";
import { ReviewAnswersLink } from "@/features/agents/decision-review/components/ReviewAnswersLink";
import {
  selectActiveBattleColumns,
  selectMountedBattleName,
  selectMountedBattleSetId,
} from "../shared/activeBattleColumns";
import { readAnswersFromContent } from "../decisions/readColumnAnswers";
import {
  loadDecisionVerdicts,
  saveDecisionVerdict,
  type DecisionVerdicts,
} from "../decisions/verdicts";
import {
  answerProbability,
  formatAnswerHeadline,
  METHOD_EXPLANATIONS,
  METHOD_LABELS,
  type DecisionAnswersView,
} from "@ai-matrx/agents/presentation/decision-answers";
import type { RootState } from "@/lib/redux/store";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { selectBlindActive, selectBlindOrder } from "../redux/selectors";
import { blindAnonLabel } from "../shared/blind";

function percent(value: number | null): string {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

interface ColumnAnswers {
  columnId: string;
  label: string;
  view: DecisionAnswersView | null;
}

/**
 * The latest assistant turn of each column, read for decision answers. The
 * selector walks backwards so a follow-up turn that was NOT a decision does
 * not blank a column that answered a moment ago.
 */
function selectColumnAnswers(
  byConversationId: RootState["messages"]["byConversationId"],
  conversationId: string,
) {
  const entry = byConversationId[conversationId];
  const ordered = entry?.orderedIds;
  const byId = entry?.byId;
  if (!ordered || !byId) return null;
  for (let i = ordered.length - 1; i >= 0; i--) {
    const record = byId[ordered[i]];
    if (record?.role !== "assistant") continue;
    const view = readAnswersFromContent(record.content);
    if (view) return view;
  }
  return null;
}

function ColumnAnswerCell({
  view,
  questionName,
}: {
  view: DecisionAnswersView | null;
  questionName: string;
}) {
  const answer = view?.answers.find((a) => a.name === questionName);
  if (!answer) {
    const refusal = view?.refusals.find((r) => r.name === questionName);
    if (refusal) {
      return (
        <span className="text-[11px] text-amber-600 dark:text-amber-400">
          refused — {refusal.reason}
          <ErrorAlchemyMenu error={refusal.reason} />
        </span>
      );
    }
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  const probability = answerProbability(answer);
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-medium">{formatAnswerHeadline(answer)}</span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {percent(probability)}
      </span>
    </span>
  );
}

export function DecisionComparisonTable() {
  const columns = useCatalogBoundSelector(selectActiveBattleColumns);
  const setId = useAppSelector(selectMountedBattleSetId);

  // One subscription to the message map (a stable reference between message
  // writes), then the matrix is derived. Mapping inside the selector would
  // mint a new array on every unrelated store write.
  const messagesByConversationId = useAppSelector(
    (state: RootState) => state.messages.byConversationId,
  );

  const blindActive = useAppSelector(selectBlindActive);
  const battleName = useAppSelector(selectMountedBattleName);
  const blindOrder = useAppSelector(selectBlindOrder);
  // A blind test names columns "Response A…" everywhere, this table and what
  // it copies or saves included.
  const answersByColumn: ColumnAnswers[] = columns.map((column, index) => ({
    columnId: column.columnId,
    label: blindActive
      ? blindAnonLabel(column.columnId, blindOrder)
      : (column.label ?? `Agent ${index + 1}`),
    view: selectColumnAnswers(messagesByConversationId, column.conversationId),
  }));

  const answering = answersByColumn.filter((c) => c.view);

  // Every question any column answered, in the order the first one asked.
  const questionNames: string[] = [];
  for (const column of answering) {
    for (const answer of column.view?.answers ?? []) {
      if (!questionNames.includes(answer.name)) questionNames.push(answer.name);
    }
    for (const refusal of column.view?.refusals ?? []) {
      if (!questionNames.includes(refusal.name))
        questionNames.push(refusal.name);
    }
  }

  // Verdicts are kept WITH the battle they belong to, so switching battles
  // shows none until the new battle's load lands (no reset inside an effect).
  const [loadedVerdicts, setLoadedVerdicts] = useState<{
    setId: string;
    verdicts: DecisionVerdicts;
  } | null>(null);
  const verdicts: DecisionVerdicts =
    setId && loadedVerdicts?.setId === setId ? loadedVerdicts.verdicts : {};
  const setVerdicts = (next: DecisionVerdicts) => {
    if (setId) setLoadedVerdicts({ setId, verdicts: next });
  };
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingName, setSavingName] = useState<string | null>(null);
  const [verdictError, setVerdictError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId) return;
    let cancelled = false;
    loadDecisionVerdicts(setId)
      .then((loaded) => {
        if (!cancelled) setLoadedVerdicts({ setId, verdicts: loaded });
      })
      .catch((error) => {
        console.error("[decision-verdicts] load failed", error);
        if (!cancelled)
          setVerdictError(
            "The verdicts already on this comparison could not be read. Anything you type now may overwrite them.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [setId]);

  const commitVerdict = async (questionName: string) => {
    if (!setId) return;
    const draft = drafts[questionName] ?? "";
    if (draft.trim() === (verdicts[questionName]?.answer ?? "")) return;
    setSavingName(questionName);
    setVerdictError(null);
    try {
      const next = await saveDecisionVerdict(setId, questionName, draft);
      setVerdicts(next);
      // The same truth labels every column's answer in the decision review
      // store (platform.judge_verdict), so a battle verdict feeds each
      // answering agent version's calibration.
      if (draft.trim()) {
        const conversationIds = answersByColumn
          .filter((c) => c.view?.answers.some((a) => a.name === questionName))
          .map(
            (c) =>
              columns.find((col) => col.columnId === c.columnId)
                ?.conversationId,
          )
          .filter((id): id is string => Boolean(id));
        if (conversationIds.length > 0) {
          try {
            const labeled = await labelConversations(
              conversationIds,
              questionName,
              draft,
            );
            const skipped = Object.values(labeled.skipped ?? {});
            if (skipped.length > 0) {
              setVerdictError(
                `Saved on the comparison, but not recorded for calibration on ${skipped.length} column(s): ${skipped[0]}`,
              );
            }
          } catch (labelError) {
            console.error(
              "[decision-verdicts] calibration label failed",
              labelError,
            );
            setVerdictError(
              "Saved on the comparison, but not recorded for calibration — label it from Review answers instead.",
            );
          }
        }
      }
    } catch (error) {
      console.error("[decision-verdicts] save failed", error);
      setVerdictError(
        "That verdict was not saved. It is still in the box — try again, or copy it out before leaving.",
      );
    } finally {
      setSavingName(null);
    }
  };

  if (answering.length === 0) {
    return (
      <p className="p-3 text-xs text-muted-foreground">
        {/* read-gate-exempt: answers stream from this session's live runs in the message store (each column shows its own run failure); no read feeds this */}
        No column has returned decision answers yet.
      </p>
    );
  }

  const reviewAgentId = columns.find((c) => c.agentId)?.agentId ?? null;

  // The table as rows — for Copy / Copy for AI / Export / Save to.
  const decisionsGrid = {
    headers: ["Question", ...answering.map((c) => c.label), "Delta", "Verdict"],
    rows: questionNames.map((name) => {
      const answers = answering.map((c) =>
        c.view?.answers.find((a) => a.name === name),
      );
      const shown = answers.map((a) => (a ? formatAnswerHeadline(a) : ""));
      const probabilities = answers
        .map((a) => (a ? answerProbability(a) : null))
        .filter((p): p is number => p != null);
      const nonEmpty = shown.filter(Boolean);
      const delta =
        nonEmpty.length >= 2 && new Set(nonEmpty).size > 1
          ? "different answers"
          : probabilities.length >= 2
            ? percent(Math.max(...probabilities) - Math.min(...probabilities))
            : "";
      const asked = answers.find((a) => a?.instruction)?.instruction;
      return [asked ?? name, ...shown, delta, verdicts[name]?.answer ?? ""];
    }),
  };

  const answersFor = (name: string) =>
    answering.map((c) => c.view?.answers.find((a) => a.name === name));
  const deltaOf = (name: string) => {
    const answers = answersFor(name);
    const probabilities = answers
      .map((a) => (a ? answerProbability(a) : null))
      .filter((p): p is number => p != null);
    const spread =
      probabilities.length >= 2
        ? Math.max(...probabilities) - Math.min(...probabilities)
        : null;
    const shownAnswers = answers
      .map((a) => (a ? formatAnswerHeadline(a) : null))
      .filter((a): a is string => a != null);
    const disagree = shownAnswers.length >= 2 && new Set(shownAnswers).size > 1;
    return { spread, disagree };
  };

  const subjects: ComparisonSubject[] = answering.map((column) => ({
    id: column.columnId,
    label: column.label,
    header: (
      <span className="inline-flex items-center gap-1.5">
        {column.label}
        {column.view?.method && (
          <span
            className="font-normal text-[10px] text-muted-foreground"
            title={METHOD_EXPLANATIONS[column.view.method]}
          >
            {METHOD_LABELS[column.view.method]}
          </span>
        )}
      </span>
    ),
  }));

  const rows: ComparisonRow[] = questionNames.map((name) => {
    // The question as asked leads; the field name is secondary.
    const asked = answersFor(name).find((a) => a?.instruction)?.instruction;
    return {
      id: name,
      label: asked ?? name,
      header: (
        <>
          {asked && (
            <span className="block text-xs leading-snug text-foreground">
              {asked}
            </span>
          )}
          <span className="block font-mono text-[10px] text-muted-foreground">
            {name}
          </span>
        </>
      ),
      cell: (subject) => {
        const column = answering.find((c) => c.columnId === subject.id);
        const answer = column?.view?.answers.find((a) => a.name === name);
        const refusal = answer
          ? undefined
          : column?.view?.refusals.find((r) => r.name === name);
        if (!answer && !refusal) return null;
        return {
          text: answer ? formatAnswerHeadline(answer) : `refused — ${refusal?.reason ?? ""}`,
          node: <ColumnAnswerCell view={column?.view ?? null} questionName={name} />,
        };
      },
    };
  });

  const extraColumns: ComparisonExtraColumn[] = [
    {
      id: "delta",
      label: "Delta",
      width: 110,
      text: (row) => {
        const { spread, disagree } = deltaOf(row.id);
        return disagree ? "different answers" : spread != null ? percent(spread) : "";
      },
      cell: (row) => {
        const { spread, disagree } = deltaOf(row.id);
        return disagree ? (
          <Badge tone="destructive">different answers</Badge>
        ) : spread != null ? (
          <span
            className={cn(
              "font-mono text-[10px]",
              spread >= 0.2 ? "text-warning" : "text-muted-foreground",
            )}
          >
            {percent(spread)}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "verdict",
      label: "Verdict",
      width: 220,
      text: (row) => verdicts[row.id]?.answer ?? "",
      cell: (row) => {
        const name = row.id;
        const verdict = verdicts[name];
        const draft = drafts[name] ?? verdict?.answer ?? "";
        return (
          <div className="flex items-center gap-1">
            <Input
              value={draft}
              disabled={!setId}
              onChange={(e) =>
                setDrafts((prev) => ({
                  ...prev,
                  [name]: e.target.value,
                }))
              }
              onBlur={() => void commitVerdict(name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitVerdict(name);
              }}
              placeholder={setId ? "What was true" : "Save first"}
              aria-label={`True answer for ${name}`}
            />
            {savingName === name ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            ) : verdict ? (
              <Check className="w-3 h-3 text-success" aria-label="Verdict saved" />
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-2 p-2">
      {reviewAgentId && (
        <div className="flex items-center justify-end gap-2">
          <ReviewAnswersLink agentId={reviewAgentId} force />
        </div>
      )}
      {answering.length < 2 && (
        <p className="text-[11px] text-muted-foreground">
          The delta appears once a second column answers.
        </p>
      )}

      {!setId && (
        <p className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            Save this comparison before recording verdicts — an unsaved battle
            has nowhere to keep them.
          </span>
        </p>
      )}

      {verdictError && (
        <p className="flex items-start gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive-ink">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{verdictError}</span>
          <ErrorAlchemyMenu error={verdictError} />
        </p>
      )}

      <MatrxComparisonTable
        title={battleName ? `${battleName} — Decisions` : "Decisions"}
        hideTitle
        location="AI Matrx — Agent Battle"
        cornerLabel="Question"
        subjects={subjects}
        rows={rows}
        extraColumns={extraColumns}
        cellLines="four"
        rowHeaderWidth={260}
        aiContext="Each column's answer to every decision question, how far apart they are, and the verdict recorded as true."
        actions={
          <TableSaveToMenu
            headers={decisionsGrid.headers}
            rows={decisionsGrid.rows}
            title={battleName ? `${battleName} — Decisions` : "Decisions"}
          />
        }
      />
    </div>
  );
}
