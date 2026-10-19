"use client";

/**
 * "Advanced" on a Tool page — one icon that opens every option of the Tool as one JSON entry, for the
 * person who has the answer already written (pasted from a note, handed over by a colleague). The friendly
 * form stays the way in; this is the way around it. Typing is checked in plain words and only the Tool's own
 * option names are applied; nothing runs until the person presses the Tool's button.
 */

import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

/** Parse what was typed: a JSON object, or a plain sentence saying why not. */
export function parseAdvanced(text: string, allowed: readonly string[]): { values: Record<string, unknown>; unused: string[] } | { problem: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { problem: "That isn't valid JSON. Check the commas and quotes." };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { problem: "Enter an object, like { \"website\": \"example.com\" }." };
  const values: Record<string, unknown> = {};
  const unused: string[] = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (allowed.includes(key)) values[key] = value;
    else unused.push(key);
  }
  return { values, unused };
}

export function ToolAdvanced({
  names,
  current,
  onApply,
}: {
  /** Every option name the Tool's form declares. */
  names: readonly string[];
  /** What the form holds now (empty ones left out). */
  current: Record<string, unknown>;
  onApply: (values: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [unused, setUnused] = useState<string[]>([]);

  const toggle = () => {
    if (!open) setText(JSON.stringify(current, null, 2));
    setProblem(null);
    setUnused([]);
    setOpen(!open);
  };

  const apply = () => {
    const result = parseAdvanced(text, names);
    if ("problem" in result) {
      setProblem(result.problem);
      return;
    }
    setProblem(null);
    setUnused(result.unused);
    onApply(result.values);
  };

  return (
    <div className="flex flex-col gap-2" data-tool-advanced="">
      <Button variant="quiet" className="self-start" pressed={open} onClick={toggle} icon={<SlidersHorizontal className="h-4 w-4" />} aria-label="Advanced" aria-expanded={open}>
        Advanced
      </Button>
      {open ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            rows={8}
            placeholder={`{ "${names[0] ?? "option"}": "…" }`}
            aria-label="Advanced options as JSON"
            className="w-full resize-y rounded-lg border border-border bg-background p-3 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {problem ? (
            <p className="flex items-start gap-2 text-sm text-destructive" role="alert" data-advanced-problem="">
              <span className="min-w-0 flex-1">{problem}</span>
              <ErrorAlchemyMenu error={problem} />
            </p>
          ) : null}
          {unused.length > 0 ? (
            <p className="text-sm text-muted-foreground" data-advanced-unused="">
              Not used by this Tool: {unused.join(", ")}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" onClick={apply}>
              Use these
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
