"use client";
import { humanizeIdentifier } from "@ai-matrx/kit/text-case";

import { ChevronLeft, CircleCheck, Gauge, ListChecks, Percent, Plus, SlidersHorizontal, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Tile } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { cn } from "@/lib/utils";
import {
  changeKind,
  criteriaRowsAsJson,
  looksLikeJson,
  newQuestion,
  type DecisionQuestion,
  type QuestionKind,
} from "./decision-form";

interface Props {
  questions: DecisionQuestion[];
  onChange: (questions: DecisionQuestion[]) => void;
}

// Helpers are short enough to sit on one line in a two-column tile grid.
const KINDS: Array<{ kind: QuestionKind; label: string; helper: string; icon: LucideIcon; placeholder: string }> = [
  { kind: "yes_no", label: "Yes or no", helper: "A simple yes or no", icon: CircleCheck, placeholder: "e.g. Should we refund this order?" },
  { kind: "pick_one", label: "Pick one", helper: "One of your options", icon: ListChecks, placeholder: "e.g. Which team should handle this?" },
  { kind: "score", label: "Score", helper: "Rate it on your scale", icon: Gauge, placeholder: "e.g. How urgent is this?" },
  { kind: "how_true", label: "How true", helper: "From 0 to 100% true", icon: Percent, placeholder: "e.g. The customer is upset" },
];

const kindOf = (kind: QuestionKind) => KINDS.find((option) => option.kind === kind) ?? KINDS[0];

const FIELD_LABEL = "text-xs font-medium text-muted-foreground";

export function DecisionQuestionEditor({ questions, onChange }: Props) {
  // With no questions the picker is always open; after that "Add question" opens it.
  const [picking, setPicking] = useState(false);
  const replace = (index: number, next: DecisionQuestion) =>
    onChange(questions.map((question, questionIndex) => (questionIndex === index ? next : question)));
  const remove = (index: number) => onChange(questions.filter((_, questionIndex) => questionIndex !== index));
  const showPicker = picking || questions.length === 0;

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          others={questions.filter((_, otherIndex) => otherIndex !== index)}
          onChange={(next) => replace(index, next)}
          onRemove={() => remove(index)}
        />
      ))}
      {showPicker ? (
        <KindPicker
          onPick={(kind) => {
            onChange([...questions, newQuestion(kind, questions)]);
            setPicking(false);
          }}
          onCancel={questions.length > 0 ? () => setPicking(false) : undefined}
        />
      ) : (
        <Button icon={<Plus />} variant="outline" type="button" onClick={() => setPicking(true)}>
          Add question
        </Button>
      )}
    </div>
  );
}

function KindPicker({ current, onPick, onCancel }: { current?: QuestionKind; onPick: (kind: QuestionKind) => void; onCancel?: () => void }) {
  return (
    <div className="space-y-2">
      {onCancel && (
        <div className="flex items-center justify-between">
          <span className={FIELD_LABEL}>Choose a question type</span>
          <Button icon={<X />} variant="quiet" type="button" onClick={onCancel} aria-label="Cancel" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {KINDS.map((option) => {
          const Icon = option.icon;
          return (
            <Tile
              key={option.kind}
              selected={current === undefined ? undefined : current === option.kind}
              title={
                <span className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  {option.label}
                </span>
              }
              line={option.helper}
              onClick={() => onPick(option.kind)}
            />
          );
        })}
      </div>
    </div>
  );
}

function QuestionCard({
  question,
  index,
  others,
  onChange,
  onRemove,
}: {
  question: DecisionQuestion;
  index: number;
  others: DecisionQuestion[];
  onChange: (question: DecisionQuestion) => void;
  onRemove: () => void;
}) {
  const [changingKind, setChangingKind] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const kind = kindOf(question.kind);
  const Icon = kind.icon;

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-1 border-b border-border py-1 pl-1 pr-2">
        <Button
          icon={<ChevronLeft />}
          variant="quiet"
          type="button"
          onClick={() => setChangingKind((open) => !open)}
          aria-label="Change question type"
          title="Change question type"
        />
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="ml-1 shrink-0 text-sm font-medium text-foreground">{kind.label}</span>
        <span className="hidden shrink-0 text-sm text-muted-foreground sm:inline">· Question {index + 1}</span>
        <span className="ml-auto flex items-center gap-1">
          <Button
            icon={<SlidersHorizontal />}
            variant="quiet"
            type="button"
            onClick={() => setAdvanced((open) => !open)}
            aria-pressed={advanced}
            aria-label="Advanced"
          >
            <span className="hidden sm:inline">Advanced</span>
          </Button>
          <Button icon={<Trash2 />} variant="quiet" type="button" onClick={onRemove} aria-label={`Delete question ${index + 1}`} />
        </span>
      </header>

      {changingKind ? (
        <div className="p-4">
          <KindPicker
            current={question.kind}
            onPick={(next) => {
              if (next !== question.kind) onChange(changeKind(question, next, others));
              setChangingKind(false);
            }}
            onCancel={() => setChangingKind(false)}
          />
        </div>
      ) : (
        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <span className={FIELD_LABEL}>Question</span>
            <ProTextarea
              value={question.instructions}
              onChange={(event) => onChange({ ...question, instructions: event.target.value })}
              placeholder={kind.placeholder}
              aria-label={`Question ${index + 1}`}
              autoGrow
              minHeight={64}
              maxHeight={200}
              className={cn("text-sm", looksLikeJson(question.instructions) && "font-mono")}
            />
          </div>

          {question.criteriaMode === "json" ? (
            <CriteriaJson question={question} onChange={onChange} />
          ) : (
            <CriteriaRows question={question} onChange={onChange} />
          )}

          {advanced && (
            <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <span className={FIELD_LABEL}>Answer name</span>
                <ProInput
                  value={question.name}
                  onChange={(event) => onChange({ ...question, name: event.target.value })}
                  aria-label={`Question ${index + 1} answer name`}
                  placeholder="e.g. refund"
                  enableVoice={false}
                  showCopyButton={false}
                />
              </div>
              <Button
                variant="outline"
                type="button"
                onClick={() =>
                  onChange(
                    question.criteriaMode === "json"
                      ? { ...question, criteriaMode: "rows" }
                      : { ...question, criteriaMode: "json", criteriaJson: criteriaRowsAsJson(question) },
                  )
                }
              >
                {question.criteriaMode === "json" ? "Edit options as a list" : "Edit options as JSON"}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function CriteriaJson({ question, onChange }: { question: DecisionQuestion; onChange: (question: DecisionQuestion) => void }) {
  return (
    <div className="space-y-1.5">
      <span className={FIELD_LABEL}>Options as JSON</span>
      <ProTextarea
        value={question.criteriaJson}
        onChange={(event) => onChange({ ...question, criteriaJson: event.target.value })}
        aria-label="Options as JSON"
        autoGrow
        minHeight={96}
        maxHeight={260}
        className="font-mono text-sm"
      />
    </div>
  );
}

// Every option row is the same three columns, so names, descriptions and
// remove buttons line up down the card.
// Each row: a fixed-width first cell, the description taking the rest, then a
// remove slot of the same width on every row.
const ROW = "flex items-center gap-2";
const FIRST_CELL = "w-28 shrink-0 sm:w-36";
// Fixed labels (Yes / No, True / False) are one short word: a narrow first cell.
const FIXED_CELL = "w-12 shrink-0 text-sm font-medium text-foreground";
const REST = "min-w-0 flex-1";
const END_CELL = "flex w-9 shrink-0 justify-center";

function RemoveRow({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <span className={END_CELL}>
      <Button icon={<X />} type="button" variant="quiet" disabled={disabled} onClick={onClick} aria-label={label} />
    </span>
  );
}

function CriteriaRows({ question, onChange }: { question: DecisionQuestion; onChange: (question: DecisionQuestion) => void }) {
  if (question.type === "noul") {
    return (
      <div className="space-y-1.5">
        <span className={FIELD_LABEL}>What true and false mean (optional)</span>
        {(["true", "false"] as const).map((side) => (
          <div key={side} className={ROW}>
            <span className={FIXED_CELL}>{side === "true" ? "True" : "False"}</span>
            <ProInput
              value={question.criteria[side]}
              onChange={(event) => onChange({ ...question, criteria: { ...question.criteria, [side]: event.target.value } })}
              placeholder={side === "true" ? "e.g. They say they are unhappy" : "e.g. They sound satisfied"}
              aria-label={`${side === "true" ? "True" : "False"} means`}
              showCopyButton={false}
              wrapperClassName={REST}
            />
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "score") {
    const placeholders = ["e.g. Low", "e.g. High"];
    return (
      <div className="space-y-1.5">
        <span className={FIELD_LABEL}>Levels, lowest first</span>
        {question.criteria.map((level, levelIndex) => (
          <div key={`${question.id}-${levelIndex}`} className={ROW}>
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{levelIndex + 1}</span>
            <ProInput
              value={level}
              onChange={(event) =>
                onChange({ ...question, criteria: question.criteria.map((value, valueIndex) => (valueIndex === levelIndex ? event.target.value : value)) })
              }
              placeholder={placeholders[levelIndex] ?? "Next level"}
              aria-label={`Level ${levelIndex + 1}`}
              showCopyButton={false}
              wrapperClassName={REST}
            />
            <RemoveRow
              label={`Remove level ${levelIndex + 1}`}
              disabled={question.criteria.length <= 2}
              onClick={() => onChange({ ...question, criteria: question.criteria.filter((_, valueIndex) => valueIndex !== levelIndex) })}
            />
          </div>
        ))}
        <Button icon={<Plus />} type="button" variant="quiet" onClick={() => onChange({ ...question, criteria: [...question.criteria, ""] })}>
          Add level
        </Button>
      </div>
    );
  }

  const fixed = question.kind === "yes_no";
  const keyPlaceholders = ["e.g. Sales", "e.g. Support"];
  return (
    <div className="space-y-1.5">
      <span className={FIELD_LABEL}>{fixed ? "When to answer each (optional)" : "Options"}</span>
      {question.criteria.map((criterion, optionIndex) => (
        <div key={`${question.id}-${optionIndex}`} className={ROW}>
          {fixed ? (
            <span className={cn(FIXED_CELL, "capitalize")}>{humanizeIdentifier(criterion.key)}</span>
          ) : (
            <ProInput
              value={criterion.key}
              onChange={(event) =>
                onChange({ ...question, criteria: question.criteria.map((value, valueIndex) => (valueIndex === optionIndex ? { ...value, key: event.target.value } : value)) })
              }
              aria-label={`Option ${optionIndex + 1}`}
              placeholder={keyPlaceholders[optionIndex] ?? "Option"}
              enableVoice={false}
              showCopyButton={false}
              wrapperClassName={FIRST_CELL}
            />
          )}
          <ProInput
            value={criterion.description}
            onChange={(event) =>
              onChange({ ...question, criteria: question.criteria.map((value, valueIndex) => (valueIndex === optionIndex ? { ...value, description: event.target.value } : value)) })
            }
            aria-label={`When to pick ${criterion.key || `option ${optionIndex + 1}`}`}
            placeholder="When to pick it (optional)"
            showCopyButton={false}
            wrapperClassName={REST}
          />
          {fixed ? null : (
            <RemoveRow
              label={`Remove option ${optionIndex + 1}`}
              disabled={question.criteria.length <= 2}
              onClick={() => onChange({ ...question, criteria: question.criteria.filter((_, valueIndex) => valueIndex !== optionIndex) })}
            />
          )}
        </div>
      ))}
      {!fixed && (
        <Button icon={<Plus />} type="button" variant="quiet" onClick={() => onChange({ ...question, criteria: [...question.criteria, { key: "", description: "" }] })}>
          Add option
        </Button>
      )}
    </div>
  );
}
