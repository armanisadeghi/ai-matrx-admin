"use client";

/**
 * "Describe what you want" on a Tool page — say it in your own words and the form fills itself. The
 * button asks the server whether the step has an agent behind it; until one is bound it says "Coming soon",
 * plainly, and does nothing else (nothing is faked, nothing runs, nothing is charged). The step is a
 * declared mandate (`tools.describe_to_form`): the person's words travel as the only thing they typed, the
 * Tool's form travels as named values.
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";

import { getJson, postJson } from "@/lib/python-client";

interface DescribeStatus {
  status: "ready" | "no_agent_bound";
  message?: string;
}
interface FilledField {
  name: string;
  value: string;
}

/** The values a finished step hands back, or null when the answer carries none. */
export function filledValues(output: unknown): Record<string, unknown> | null {
  if (output === null || typeof output !== "object") return null;
  const fields = (output as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return null;
  const out: Record<string, unknown> = {};
  for (const f of fields as FilledField[]) if (f && typeof f.name === "string" && typeof f.value === "string") out[f.name] = f.value;
  return out;
}

export function ToolDescribe({
  toolId,
  current,
  names,
  onFill,
}: {
  toolId: string;
  current: Record<string, unknown>;
  names: readonly string[];
  onFill: (values: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState("");
  const status = useQuery<DescribeStatus>({
    queryKey: ["tools", "describe-status"],
    staleTime: 60 * 1000,
    queryFn: async ({ signal }) => {
      try {
        return (await getJson<DescribeStatus>("/tools/catalog/describe-status", { signal, expectedErrorStatuses: [404] })).data;
      } catch (error) {
        // A server that does not have the step yet is the same truth as one with no agent behind it.
        if ((error as { status?: number | null }).status === 404) return { status: "no_agent_bound" as const };
        throw error;
      }
    },
  });
  const fill = useMutation({
    mutationFn: async () => (await postJson<{ status: string; output?: unknown }>(`/tools/${encodeURIComponent(toolId)}/describe`, { words: words.trim(), current_values: current })).data,
    onSuccess: (answer) => {
      const values = filledValues(answer.output);
      if (values) {
        const known = Object.fromEntries(Object.entries(values).filter(([k]) => names.includes(k)));
        onFill(known);
        setOpen(false);
        setWords("");
      }
    },
  });

  const soon = status.data?.status === "no_agent_bound";
  const unavailable = status.isError;
  const ready = status.data?.status === "ready";
  const noAnswer = fill.isSuccess && filledValues(fill.data.output) === null;

  return (
    <div className="flex flex-col gap-2" data-tool-describe="">
      <Button variant="quiet" className="self-start" pressed={open} onClick={() => setOpen(!open)} icon={<Sparkles className="h-4 w-4" />} aria-expanded={open}>
        Describe what you want
      </Button>
      {open ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3">
          {soon ? (
            <p className="text-sm text-foreground" data-describe-soon="">
              Coming soon
            </p>
          ) : unavailable ? (
            <p className="text-sm text-muted-foreground" data-describe-unavailable="">
              Couldn't check this just now. Try again in a moment.
            </p>
          ) : ready ? (
            <>
              <textarea
                value={words}
                onChange={(e) => setWords(e.target.value)}
                rows={3}
                placeholder="Say it in your own words"
                aria-label="Describe what you want"
                className="w-full resize-y rounded-lg border border-border bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {fill.isError ? (
                <p className="text-sm text-destructive" role="alert">
                  That didn't work. Try again.
                </p>
              ) : null}
              {noAnswer || (fill.isSuccess && fill.data.status === "no_agent_bound") ? <p className="text-sm text-muted-foreground">Couldn't fill the form from that. Add a little more.</p> : null}
              <Button variant="outline" className="self-start" disabled={words.trim() === "" || fill.isPending} onClick={() => fill.mutate()}>
                {fill.isPending ? "Filling…" : "Fill the form"}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Checking…</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
