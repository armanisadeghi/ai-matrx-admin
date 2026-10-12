"use client";

/**
 * THE HUMAN GATE panel — renders any `decision` spec (matrx_graph/decision_spec.py).
 *
 * One row per item: what we believe, where it came from, how sure we are, and the
 * quick choices the item allows. The one button stays off until the engine would
 * accept the answer (required items + minimum); the engine re-validates anyway, so
 * this is a courtesy, never the gate. Cmd/Ctrl+Enter submits. Rows stack on a phone.
 * Hosts: `InterruptQuestion` (any run page / window) and `HumanGatePanel` (inline on
 * a record's page). Contract: common-docs/systems/workflows/human-gates/FEATURE.md.
 */

import { useState, type KeyboardEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button, Chip, SegmentedControl } from "@ai-matrx/design-system/controls";
import { ProInput } from "@/components/official/ProInput";
import { cn } from "@/lib/utils";
import {
  VALUE_VERDICTS,
  decisionBlockers,
  decisionResumeValue,
  decisionValueText,
  type DecisionAnswer,
  type DecisionChoice,
  type DecisionItemView,
  type DecisionSpecView,
} from "./interrupt-view";

const CHOICE_LABEL: Record<DecisionChoice, string> = {
  confirm: "Yes",
  not_true: "Not us",
  edit: "Edit",
  pick_one: "Pick",
  pick_many: "Pick",
  custom: "Other",
};

function confidenceText(confidence: number | null): string | null {
  if (confidence === null) return null;
  return `${Math.round(confidence * 100)}% sure`;
}

function draftFor(item: DecisionItemView): string {
  return decisionValueText(item.value);
}

/** Text typed for a list-valued item becomes a list again (comma-separated). */
function typedValue(item: DecisionItemView, text: string): unknown {
  if (Array.isArray(item.value)) {
    return text
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return text;
}

export function DecisionPanel({
  spec,
  sending,
  onSubmit,
}: {
  spec: DecisionSpecView;
  sending: boolean;
  onSubmit: (resumeValue: Record<string, unknown>) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, DecisionAnswer>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const blockers = decisionBlockers(spec, answers);
  const ready = blockers.missingRequired.length === 0 && blockers.needMore === 0;

  const choose = (item: DecisionItemView, verdict: DecisionChoice) => {
    setAnswers((prev) => {
      const next = { ...prev };
      if (verdict === "edit" || verdict === "custom") {
        const text = drafts[item.key] ?? (verdict === "edit" ? draftFor(item) : "");
        next[item.key] = { verdict, value: typedValue(item, text) };
      } else if (verdict === "pick_one" || verdict === "pick_many") {
        next[item.key] = { verdict, value: verdict === "pick_many" ? [] : undefined };
      } else {
        next[item.key] = { verdict };
      }
      return next;
    });
    if (verdict === "edit") {
      setDrafts((prev) => (item.key in prev ? prev : { ...prev, [item.key]: draftFor(item) }));
    }
  };

  const type = (item: DecisionItemView, text: string) => {
    setDrafts((prev) => ({ ...prev, [item.key]: text }));
    setAnswers((prev) => {
      const current = prev[item.key];
      if (!current || !VALUE_VERDICTS.has(current.verdict)) return prev;
      return { ...prev, [item.key]: { verdict: current.verdict, value: typedValue(item, text) } };
    });
  };

  const pick = (item: DecisionItemView, value: unknown) => {
    setAnswers((prev) => {
      const current = prev[item.key];
      if (current?.verdict === "pick_many") {
        const list = Array.isArray(current.value) ? current.value : [];
        const has = list.some((v) => JSON.stringify(v) === JSON.stringify(value));
        return {
          ...prev,
          [item.key]: {
            verdict: "pick_many",
            value: has ? list.filter((v) => JSON.stringify(v) !== JSON.stringify(value)) : [...list, value],
          },
        };
      }
      return { ...prev, [item.key]: { verdict: "pick_one", value } };
    });
  };

  const submit = () => {
    if (!ready || sending) return;
    onSubmit(decisionResumeValue(spec, answers));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      submit();
    }
  };

  const status = blockers.missingRequired.length > 0
    ? `Needed: ${blockers.missingRequired.join(", ")}`
    : blockers.needMore > 0
      ? `Answer ${blockers.needMore} more`
      : null;

  return (
    <div data-decision-panel onKeyDown={onKeyDown} className="mt-2">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {spec.items.map((item) => {
          const answer = answers[item.key];
          const verdict = answer?.verdict ?? null;
          const pickVerdict = item.choices.find((c) => c === "pick_one" || c === "pick_many");
          const shown = decisionValueText(item.value);
          const meta = [item.source, confidenceText(item.confidence)].filter(Boolean).join(" · ");
          const segments = item.choices
            .filter((c, i, all) => !(c === "pick_many" && all.includes("pick_one")))
            .map((c) => ({ value: c, label: CHOICE_LABEL[c] }));
          return (
            <li key={item.key} data-decision-item={item.key} className="px-3 py-2">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>{item.label}</span>
                    {item.required ? <span aria-label="required">*</span> : null}
                  </div>
                  <div
                    className={cn(
                      "truncate text-sm",
                      shown ? "text-foreground" : "text-muted-foreground",
                      verdict === "not_true" && "line-through decoration-muted-foreground",
                    )}
                    title={shown || undefined}
                  >
                    {shown || "Nothing yet"}
                  </div>
                  {meta ? <div className="truncate text-[11px] text-muted-foreground">{meta}</div> : null}
                </div>
                <SegmentedControl<DecisionChoice>
                  aria-label={`${item.label}: your answer`}
                  value={verdict === "pick_many" && pickVerdict === "pick_one" ? "pick_one" : verdict}
                  onValueChange={(v) => choose(item, v === "pick_one" && pickVerdict ? pickVerdict : v)}
                  data={segments}
                  className="shrink-0 self-start sm:self-center"
                />
              </div>
              {verdict === "edit" || verdict === "custom" ? (
                <ProInput
                  className="mt-1.5"
                  autoFocus
                  aria-label={`${item.label}: the right value`}
                  placeholder={Array.isArray(item.value) ? "Separate with commas" : item.label}
                  value={drafts[item.key] ?? ""}
                  onChange={(event) => type(item, event.target.value)}
                />
              ) : null}
              {(verdict === "pick_one" || verdict === "pick_many") && item.options.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {item.options.map((option) => {
                    const on = Array.isArray(answer?.value)
                      ? answer.value.some((v) => JSON.stringify(v) === JSON.stringify(option.value))
                      : JSON.stringify(answer?.value) === JSON.stringify(option.value);
                    return (
                      <Chip key={option.label} label={option.label} pressed={on} asChild>
                        <button type="button" onClick={() => pick(item, option.value)} />
                      </Chip>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex items-center justify-end gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" aria-live="polite">
          {status ?? ""}
        </span>
        <Button
          variant="success"
          disabled={!ready || sending}
          icon={sending ? <Loader2 className="animate-spin" /> : <Check />}
          onClick={submit}
          data-decision-submit
        >
          {spec.submitLabel}
        </Button>
      </div>
    </div>
  );
}
