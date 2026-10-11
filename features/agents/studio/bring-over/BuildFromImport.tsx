"use client";

/**
 * "Build the agent" for a chat brought over from Claude: the Studio's existing from-chat door
 * (`makeAgentFromChat` with `import_source`, door `studio`, always the Agent Factory), then the same
 * `BuildProgress` view every other door uses. No builder of its own.
 */

import { useState } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux/hooks";
import { BuildProgress } from "@/features/agents/factory/components/BuildProgress";
import { FROM_CHAT_STEPS, makeAgentFromChat, type FromChatStep, type ImportSourceInput } from "@/features/agents/from-chat/service";

interface BuildFromImportProps {
  source: ImportSourceInput;
  disabled?: boolean;
  /** Why the button is not pressable yet (shown in words under it). */
  disabledReason?: string;
}

export function BuildFromImport({ source, disabled, disabledReason }: BuildFromImportProps) {
  const dispatch = useAppDispatch();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<FromChatStep | null>(null);
  const [says, setSays] = useState("");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [builtAgentId, setBuiltAgentId] = useState<string | null>(null);

  const start = async () => {
    setRunning(true);
    setFailure(null);
    const answer = await makeAgentFromChat(
      dispatch,
      source,
      (s, text) => {
        setStep(s);
        setSays(text);
      },
      [],
      undefined,
      { approvedOutput: "", capture: "" },
    );
    setRunning(false);
    if (!answer.ok) {
      setFailure(answer.says);
    } else if ("buildId" in answer) {
      setBuildId(answer.buildId);
    } else if ("result" in answer) {
      setBuiltAgentId(answer.result.agent_id);
    }
  };

  if (buildId) return <BuildProgress buildId={buildId} forwardWhenKept />;
  if (builtAgentId) {
    return (
      <a className="text-sm underline" href={`/agents/${builtAgentId}/build`}>
        Open your new agent
      </a>
    );
  }
  return (
    <div className="space-y-2" data-testid="bring-over-build">
      <Button onClick={start} disabled={disabled || running}>
        {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {running ? "Building…" : "Build the agent"}
      </Button>
      {disabled && disabledReason ? <p className="text-sm text-muted-foreground">{disabledReason}</p> : null}
      {running ? (
        <ol className="space-y-1 text-sm">
          {FROM_CHAT_STEPS.map((s) => (
            <li key={s.step} className={s.step === step ? "font-medium text-foreground" : "text-muted-foreground"}>
              {s.label}
              {s.step === step && says ? ` — ${says}` : ""}
            </li>
          ))}
        </ol>
      ) : null}
      {failure ? (
        <p className="flex items-start gap-2 text-sm text-destructive" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {failure}
        </p>
      ) : null}
    </div>
  );
}
