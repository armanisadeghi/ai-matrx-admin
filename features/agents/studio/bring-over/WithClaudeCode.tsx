"use client";

import { ProTextarea } from "@/components/official/ProTextarea";

/**
 * Mode "Build it with Claude Code". Without a draft: the copyable prompt for Claude Code. With
 * `?draft=<id>` (the link the plugin skill returns): what Claude Code sent, then Build, through the
 * Studio's from-chat door and the Agent Factory. Claude never writes the agent; its bundle is evidence.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch } from "@/lib/redux/hooks";
import { RegionSkeleton } from "@ai-matrx/design-system/controls";
import { useClipboard } from "@ai-matrx/kit/clipboard";
import { toast } from "@/lib/toast";
import { claudeCodePrompt } from "./claude-code-prompt";
import { readDraft, type ClaudeCodeDraft } from "./bring-over-api";
import { BuildFromImport } from "./BuildFromImport";
import { BringOverFrame } from "./BringOverFrame";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

export function WithClaudeCode() {
  const draftId = useSearchParams().get("draft");
  return draftId ? <DraftReview draftId={draftId} /> : <PromptToCopy />;
}

function PromptToCopy() {
  const { copyText } = useClipboard();
  const [job, setJob] = useState("");
  const [copied, setCopied] = useState(false);
  const prompt = claudeCodePrompt(job);
  const copy = async () => {
    if (!(await copyText(prompt))) {
      toast.error("Couldn't copy the Claude Code prompt");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };
  return (
    <BringOverFrame title="Build it with Claude Code" testId="with-claude-code">
      <p className="text-sm text-muted-foreground">
        Give this to Claude Code in the project where you do the work. It sends us what defines the job, and you
        finish here.
      </p>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="job">
          What should the agent do? (optional)
        </label>
        <ProTextarea id="job" rows={2} value={job} onChange={(e) => setJob(e.target.value)} />
      </div>
      <pre
        className="whitespace-pre-wrap rounded-md border bg-card p-3 text-sm"
        data-testid="claude-code-prompt"
      >
        {prompt}
      </pre>
      <Button onClick={copy}>
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copied ? "Copied" : "Copy the prompt"}
      </Button>
    </BringOverFrame>
  );
}

function DraftReview({ draftId }: { draftId: string }) {
  const dispatch = useAppDispatch();
  const [draft, setDraft] = useState<ClaudeCodeDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    readDraft(dispatch, draftId)
      .then((d) => live && setDraft(d))
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : "We couldn't open that draft."));
    return () => {
      live = false;
    };
  }, [dispatch, draftId]);

  if (error) {
    return (
      <BringOverFrame title="What Claude Code sent" testId="claude-code-draft-error">
        <p className="text-sm text-destructive" role="alert">
          {error}<ErrorAlchemyMenu error={error} />
        </p>
      </BringOverFrame>
    );
  }
  if (!draft) return <RegionSkeleton />;
  return (
    <BringOverFrame title="What Claude Code sent" testId="claude-code-draft">
      <p className="text-sm text-muted-foreground">Nothing is built yet. Check it, then build.</p>
      <section className="space-y-1">
        <h2 className="text-sm font-medium">The job</h2>
        <p className="whitespace-pre-wrap text-sm">{draft.task}</p>
      </section>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>{draft.hasClaudeMd ? "Your CLAUDE.md instructions" : "No CLAUDE.md instructions"}</li>
        <li>{draft.skills.length > 0 ? `Skills: ${draft.skills.join(", ")}` : "No skills"}</li>
        <li>
          {draft.exampleCount} real example{draft.exampleCount === 1 ? "" : "s"}
        </li>
      </ul>
      {draft.examples.map((e, i) => (
        <details key={i} className="rounded-md border p-2 text-sm">
          <summary className="cursor-pointer font-medium">Example {i + 1}</summary>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">In: {e.input}</p>
          <p className="mt-2 whitespace-pre-wrap">Out: {e.output}</p>
        </details>
      ))}
      <BuildFromImport source={{ draft_id: draft.draftId }} />
    </BringOverFrame>
  );
}
