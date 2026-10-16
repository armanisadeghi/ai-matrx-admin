"use client";

import { Gauge, ListChecks, Plus, ToggleRight, Trash2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { SegmentedControl, Tile } from "@ai-matrx/design-system/controls";
import { Button } from "@/components/ui/button";
import { ProInput } from "@/components/official/ProInput";
import { ProTextarea } from "@/components/official/ProTextarea";
import { cn } from "@/lib/utils";
import { criteriaRowsAsJson, newQuestion, type DecisionQuestion } from "./decision-form";

interface Props {
  questions: DecisionQuestion[];
  onChange: (questions: DecisionQuestion[]) => void;
}

const QUESTION_TYPES: Array<{
  type: DecisionQuestion["type"];
  label: string;
  helper: string;
  icon: LucideIcon;
}> = [
  {
    type: "choice",
    label: "Choice",
    helper: "Pick one answer from options you name",
    icon: ListChecks,
  },
  {
    type: "score",
    label: "Score",
    helper: "Rate it on a scale of levels you define",
    icon: Gauge,
  },
  {
    type: "noul",
    label: "Noul",
    helper: "How true a statement is, from 0 to 100%",
    icon: ToggleRight,
  },
];

const FIELD_LABEL = "text-xs font-medium text-muted-foreground";

export function DecisionQuestionEditor({ questions, onChange }: Props) {
  // The type picker is the way in: with no questions it is always open; after
  // that, "Add question" opens it again.
  const [picking, setPicking] = useState(false);
  const update = (index: number, next: DecisionQuestion) => {
    onChange(questions.map((question, questionIndex) => (questionIndex === index ? next : question)));
  };
  const remove = (index: number) => onChange(questions.filter((_, questionIndex) => questionIndex !== index));
  const add = (type: DecisionQuestion["type"]) => {
    onChange([...questions, newQuestion(type, questions)]);
    setPicking(false);
  };
  const showPicker = picking || questions.length === 0;

  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <QuestionCard
          key={question.id}
          question={question}
          index={index}
          onChange={(next) => update(index, next)}
          onRemove={() => remove(index)}
        />
      ))}
      {showPicker ? (
        <div className="space-y-2">
          {questions.length > 0 && (
            <div className="flex items-center justify-between">
              <span className={FIELD_LABEL}>What kind of question?</span>
              <Button icon={<X />} variant="quiet" type="button" onClick={() => setPicking(false)} aria-label="Cancel adding a question" />
            </div>
          )}
          <div className="grid gap-2.5 sm:grid-cols-3">
            {QUESTION_TYPES.map((option) => {
              const Icon = option.icon;
              return (
                <Tile
                  key={option.type}
                  layout="adaptive"
                  hero
                  icon={<Icon />}
                  title={option.label}
                  line={option.helper}
                  onClick={() => add(option.type)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <Button icon={<Plus />} variant="outline" type="button" onClick={() => setPicking(true)}>
          Add question
        </Button>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: DecisionQuestion;
  index: number;
  onChange: (question: DecisionQuestion) => void;
  onRemove: () => void;
}) {
  const typeOption = QUESTION_TYPES.find((option) => option.type === question.type) ?? QUESTION_TYPES[0];
  const Icon = typeOption.icon;
  const label = question.name.trim() || `Question ${index + 1}`;
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-ink" title={typeOption.helper}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <span className={FIELD_LABEL}>{typeOption.label} · answer name</span>
          <ProInput
            value={question.name}
            onChange={(event) => onChange({ ...question, name: event.target.value })}
            aria-label={`Question ${index + 1} answer name`}
            placeholder="e.g. approve_refund"
            enableVoice={false}
            showCopyButton={false}
          />
        </div>
        <Button icon={<Trash2 />} variant="quiet" type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="self-end" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className={FIELD_LABEL}>Instructions</span>
          <EditorMode
            value={question.instructionsMode}
            textValue="text"
            textLabel="Text"
            onChange={(mode) => onChange({ ...question, instructionsMode: mode })}
          />
        </div>
        <ProTextarea
          value={question.instructionsMode === "text" ? question.instructions : question.instructionsJson}
          onChange={(event) =>
            onChange(
              question.instructionsMode === "text"
                ? { ...question, instructions: event.target.value }
                : { ...question, instructionsJson: event.target.value },
            )
          }
          placeholder={question.instructionsMode === "text" ? instructionsPlaceholder(question.type) : '{\n  "rule": "…"\n}'}
          aria-label={`${label} instructions`}
          autoGrow
          minHeight={72}
          maxHeight={200}
          className={cn("text-sm", question.instructionsMode === "json" && "font-mono")}
        />
      </div>

      <CriteriaEditor question={question} onChange={onChange} />
    </section>
  );
}

function instructionsPlaceholder(type: DecisionQuestion["type"]): string {
  if (type === "score") return "What should be scored, and what makes it high or low?";
  if (type === "noul") return "The statement to judge, e.g. “The customer is upset”";
  return "What should be decided?";
}

function CriteriaEditor({ question, onChange }: { question: DecisionQuestion; onChange: (question: DecisionQuestion) => void }) {
  const title = question.type === "choice" ? "Options" : question.type === "score" ? "Score levels, low to high" : "Meaning of true and false";
  const header = (
    <div className="flex items-center justify-between gap-2">
      <span className={FIELD_LABEL}>{title}</span>
      <EditorMode
        value={question.criteriaMode}
        textValue="rows"
        textLabel="Rows"
        onChange={(mode) =>
          onChange(
            mode === "json"
              ? { ...question, criteriaMode: mode, criteriaJson: criteriaRowsAsJson(question) }
              : { ...question, criteriaMode: mode },
          )
        }
      />
    </div>
  );

  if (question.criteriaMode === "json") {
    return (
      <div className="space-y-1.5">
        {header}
        <ProTextarea
          value={question.criteriaJson}
          onChange={(event) => onChange({ ...question, criteriaJson: event.target.value })}
          placeholder={question.type === "score" ? '[\n  "low",\n  "high"\n]' : question.type === "noul" ? '{\n  "true": null,\n  "false": null\n}' : '{\n  "yes": null,\n  "no": null\n}'}
          aria-label="Criteria JSON"
          autoGrow
          minHeight={96}
          maxHeight={260}
          className="font-mono text-sm"
        />
      </div>
    );
  }

  if (question.type === "noul") {
    return (
      <div className="space-y-1.5">
        {header}
        <div className="grid gap-2 sm:grid-cols-2">
          <ProInput
            value={question.criteria.true}
            onChange={(event) => onChange({ ...question, criteria: { ...question.criteria, true: event.target.value } })}
            placeholder="True means… (optional)"
            aria-label="True description"
            showCopyButton={false}
          />
          <ProInput
            value={question.criteria.false}
            onChange={(event) => onChange({ ...question, criteria: { ...question.criteria, false: event.target.value } })}
            placeholder="False means… (optional)"
            aria-label="False description"
            showCopyButton={false}
          />
        </div>
      </div>
    );
  }

  if (question.type === "score") {
    const placeholders = ["e.g. low", "e.g. high"];
    return (
      <div className="space-y-1.5">
        {header}
        {question.criteria.map((criterion, index) => (
          <div key={`${question.id}-${index}`} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <ProInput
              value={criterion}
              onChange={(event) =>
                onChange({ ...question, criteria: question.criteria.map((value, valueIndex) => (valueIndex === index ? event.target.value : value)) })
              }
              placeholder={placeholders[index] ?? "Next level"}
              aria-label={`Score level ${index + 1}`}
              showCopyButton={false}
              wrapperClassName="flex-1"
            />
            <Button
              icon={<Trash2 />}
              type="button"
              variant="quiet"
              disabled={question.criteria.length <= 2}
              onClick={() => onChange({ ...question, criteria: question.criteria.filter((_, valueIndex) => valueIndex !== index) })}
              aria-label={`Remove score level ${index + 1}`}
            />
          </div>
        ))}
        <Button icon={<Plus />} type="button" variant="quiet" onClick={() => onChange({ ...question, criteria: [...question.criteria, ""] })}>
          Add level
        </Button>
      </div>
    );
  }

  const keyPlaceholders = ["e.g. yes", "e.g. no"];
  return (
    <div className="space-y-1.5">
      {header}
      {question.criteria.map((criterion, index) => (
        <div key={`${question.id}-${index}`} className="grid items-center gap-2 sm:grid-cols-[minmax(8rem,0.4fr)_minmax(0,1fr)_auto]">
          <ProInput
            value={criterion.key}
            onChange={(event) =>
              onChange({ ...question, criteria: question.criteria.map((value, valueIndex) => (valueIndex === index ? { ...value, key: event.target.value } : value)) })
            }
            aria-label={`Option ${index + 1} name`}
            placeholder={keyPlaceholders[index] ?? "Option name"}
            enableVoice={false}
            showCopyButton={false}
          />
          <ProInput
            value={criterion.description}
            onChange={(event) =>
              onChange({ ...question, criteria: question.criteria.map((value, valueIndex) => (valueIndex === index ? { ...value, description: event.target.value } : value)) })
            }
            aria-label={`Option ${index + 1} description`}
            placeholder="When to pick it (optional)"
            showCopyButton={false}
          />
          <Button
            icon={<Trash2 />}
            type="button"
            variant="quiet"
            disabled={question.criteria.length <= 2}
            onClick={() => onChange({ ...question, criteria: question.criteria.filter((_, valueIndex) => valueIndex !== index) })}
            aria-label={`Remove option ${index + 1}`}
          />
        </div>
      ))}
      <Button icon={<Plus />} type="button" variant="quiet" onClick={() => onChange({ ...question, criteria: [...question.criteria, { key: "", description: "" }] })}>
        Add option
      </Button>
    </div>
  );
}

function EditorMode<M extends "text" | "rows">({
  value,
  textLabel,
  onChange,
  textValue,
}: {
  value: M | "json";
  textLabel: string;
  textValue: M;
  onChange: (value: M | "json") => void;
}) {
  return (
    <SegmentedControl
      aria-label="Editor mode"
      value={value}
      onValueChange={onChange}
      data={[
        { value: textValue, label: textLabel },
        { value: "json", label: "JSON" },
      ]}
    />
  );
}
