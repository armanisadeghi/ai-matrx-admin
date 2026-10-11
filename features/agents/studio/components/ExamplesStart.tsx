"use client";

/**
 * "From examples I already have" — the person pastes (or opens as text files) 2–5 things they
 * made, and optionally what each was made from. "Build it" is the same Agent Factory build as
 * "Describe it" (door `studio`, always the factory, no new builder): the examples ride as proof
 * cases whose baseline is the person's own work (`examplesBuildSpec`).
 */

import { useRef, useState } from "react";
import { FileUp, Plus, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { startAgentBuild } from "@/features/agents/factory/service";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { toast } from "@/lib/toast";
import {
  EXAMPLES_MAX,
  EXAMPLES_MIN,
  examplesBuildSpec,
  filledStudioExamples,
  type StudioExample,
  type StudioState,
} from "../studio-state";

/** Plain-text files only: their bytes are the example as written. */
const TEXT_FILES = ".txt,.md,.markdown,.eml,.html,.htm,.csv,.json,.xml,.rtf";
const blank = (): StudioExample => ({ output: "", input: "" });

export function ExamplesStart({ onStart }: { onStart: (patch: Partial<StudioState>) => void }) {
  const [job, setJob] = useState("");
  const [examples, setExamples] = useState<StudioExample[]>([blank(), blank()]);
  const [withInput, setWithInput] = useState<Record<number, boolean>>({});
  const [starting, setStarting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const given = filledStudioExamples(examples);

  const set = (i: number, patch: Partial<StudioExample>) =>
    setExamples((prev) => prev.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const openFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const texts: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const text = (await file.text()).trim();
        if (text) texts.push(text);
      } catch (e) {
        toast.error(`${file.name} did not open`, { description: e instanceof Error ? e.message : String(e) });
      }
    }
    setExamples((prev) => {
      const next = [...prev];
      for (const text of texts) {
        const empty = next.findIndex((e) => !e.output.trim());
        if (empty >= 0) next[empty] = { ...next[empty], output: text };
        else if (next.length < EXAMPLES_MAX) next.push({ output: text, input: "" });
      }
      return next;
    });
  };

  const build = async () => {
    if (given.length < EXAMPLES_MIN) return;
    setStarting(true);
    try {
      const buildId = await startAgentBuild({
        spec: examplesBuildSpec(given, job),
        door: "studio",
        organizationId: await ensureOrgId(null),
      });
      onStart({ mode: "from-examples", buildId });
    } catch (e) {
      toast.error("The build did not start", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4" data-testid="studio-examples">
      <ProTextarea
        aria-label="What are these? (optional)"
        placeholder="What are these? (optional)"
        value={job}
        onChange={(e) => setJob(e.target.value)}
        minHeight={40}
        autoGrow
      />
      {examples.map((example, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-2" data-testid="studio-example">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Example {i + 1}</span>
            {!withInput[i] && example.input === "" && (
              <Button
                variant="quiet"
                className="ml-auto"
                data-testid="studio-example-add-input"
                onClick={() => setWithInput((p) => ({ ...p, [i]: true }))}
                disabled={starting}
              >
                Add what it was made from
              </Button>
            )}
            {examples.length > EXAMPLES_MIN && (
              <Button
                variant="quiet"
                className={withInput[i] || example.input !== "" ? "ml-auto" : undefined}
                icon={<X />}
                aria-label={`Remove example ${i + 1}`}
                onClick={() => setExamples((prev) => prev.filter((_, j) => j !== i))}
                disabled={starting}
              />
            )}
          </div>
          <ProTextarea
            aria-label={`Example ${i + 1}`}
            placeholder="Paste something you made"
            value={example.output}
            onChange={(e) => set(i, { output: e.target.value })}
            minHeight={88}
            autoGrow
          />
          {(withInput[i] || example.input !== "") && (
            <ProTextarea
              aria-label={`What example ${i + 1} was made from`}
              placeholder="The notes, request or data you started from"
              value={example.input}
              onChange={(e) => set(i, { input: e.target.value })}
              minHeight={56}
              autoGrow
            />
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        {examples.length < EXAMPLES_MAX && (
          <Button variant="quiet" icon={<Plus />} onClick={() => setExamples((p) => [...p, blank()])} disabled={starting}>
            Add an example
          </Button>
        )}
        <Button variant="quiet" icon={<FileUp />} onClick={() => fileRef.current?.click()} disabled={starting}>
          Open text files
        </Button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={TEXT_FILES}
          className="hidden"
          data-testid="studio-examples-files"
          onChange={(e) => {
            void openFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {given.length < EXAMPLES_MIN ? `${given.length} of ${EXAMPLES_MIN} needed` : `${given.length} examples`}
        </span>
        <Button
          variant="primary"
          data-testid="studio-examples-build"
          onClick={() => void build()}
          disabled={given.length < EXAMPLES_MIN || starting}
        >
          {starting ? "Starting…" : "Build it"}
        </Button>
      </div>
    </div>
  );
}
