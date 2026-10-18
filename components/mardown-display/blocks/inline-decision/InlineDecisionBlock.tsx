"use client";

/**
 * InlineDecisionBlock — an agent's `<decision>`: alternatives the person picks
 * between, and the pick REPLACES the block in place (the chosen option's text
 * becomes the content). Drawn as a question with every option visible —
 * the same row look as the ask card's pick-one question (`ask_person`
 * `choice`, @ai-matrx/chat AskCard ChoiceBody) — so a person sees what each
 * option actually says before choosing.
 *
 * One click on a row IS the choice. The pencil edits an option's text before
 * using it; "Write my own" opens an empty box.
 */

import React, { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system";
import { ProTextarea } from "@/components/official/ProTextarea";
import type { InlineDecision, InlineDecisionOption } from "./types";

interface InlineDecisionBlockProps {
  decision: InlineDecision;
  isStreamActive?: boolean;
  /**
   * `choiceLabel` is the picked option's label when its text was kept as is
   * (null for Write my own or an edited text) — the words the choice remark uses.
   */
  onResolve: (decisionId: string, rawXml: string, chosenText: string, choiceLabel: string | null) => void;
  rawXml: string;
}

const CUSTOM_ID = "custom";

export default function InlineDecisionBlock({
  decision,
  isStreamActive = false,
  onResolve,
  rawXml,
}: InlineDecisionBlockProps) {
  // The option being edited (an option id, CUSTOM_ID, or null when none).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [fadeOut, setFadeOut] = useState(false);

  const options = decision.options.filter((o) => o.id !== CUSTOM_ID);
  const groupName = `decision-${decision.id}`;

  const resolveWith = (option: InlineDecisionOption | undefined, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreamActive) return;
    setFadeOut(true);
    setTimeout(() => {
      const kept = option !== undefined && option.text.trim() === trimmed;
      onResolve(decision.id, rawXml, trimmed, kept ? option.label : null);
    }, 280);
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div
      role="group"
      aria-label={decision.prompt}
      className={cn(
        "my-2 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-all duration-200",
        fadeOut && "-translate-y-1 scale-[0.99] opacity-0 duration-[280ms]",
      )}
    >
      <div className="text-sm font-medium text-foreground">{decision.prompt}</div>

      <div className="flex flex-col gap-1.5">
        {options.map((option) => (
          <div key={option.id} className="flex items-start gap-1">
            <label
              data-clickable=""
              className={cn(
                "flex min-w-0 flex-1 items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent",
                editingId === option.id && "border-primary",
              )}
            >
              <input
                type="radio"
                name={groupName}
                value={option.id}
                checked={editingId === option.id}
                disabled={isStreamActive}
                onChange={() => resolveWith(option, option.text)}
                className="mt-0.5 size-3.5"
              />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{option.label}</div>
                {option.text && option.text !== option.label ? (
                  <div className="mt-0.5 line-clamp-4 whitespace-pre-wrap text-muted-foreground">
                    {option.text}
                  </div>
                ) : null}
              </div>
            </label>
            <Button
              variant="quiet"
              icon={<Pencil />}
              aria-label={`Edit ${option.label}`}
              disabled={isStreamActive}
              onClick={() => startEdit(option.id, option.text)}
            />
          </div>
        ))}

        <label
          data-clickable=""
          className={cn(
            "flex items-start gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent",
            editingId === CUSTOM_ID && "border-primary",
          )}
        >
          <input
            type="radio"
            name={groupName}
            value={CUSTOM_ID}
            checked={editingId === CUSTOM_ID}
            disabled={isStreamActive}
            onChange={() => startEdit(CUSTOM_ID, "")}
            className="mt-0.5 size-3.5"
          />
          <span className="font-medium text-foreground">Write my own</span>
        </label>
      </div>

      {editingId !== null ? (
        <div className="flex flex-col gap-2">
          <ProTextarea
            aria-label="Your text"
            className="text-base"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            {isStreamActive ? (
              <Button variant="quiet" disabled icon={<Loader2 className="animate-spin" />}>
                Waiting
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={!editText.trim()}
                onClick={() =>
                  resolveWith(
                    options.find((o) => o.id === editingId),
                    editText,
                  )
                }
              >
                Use this text
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
