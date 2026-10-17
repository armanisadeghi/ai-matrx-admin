"use client";

/**
 * "Give to an agent" — one click from a Tool to one of your agents. Pick the agent, press Give; the
 * Tool lands on the agent through the same owned-agent tool delta the agent builder uses (it checks
 * the agent is yours, the Tool is live and the model can use tools). Nothing else about the agent
 * changes. Everything is opt in: a Tool is never given to an agent on its own.
 */

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { AgentListInlinePicker } from "@ai-matrx/agents/catalog/react";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { useAgentName } from "@ai-matrx/chat/agents/identity/agent-identity";
import { getModelRecords } from "@ai-matrx/chat/agents/identity/model-catalog";
import { Button } from "@ai-matrx/design-system/controls";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { applyOwnedAgentToolDelta, fetchAgentExecutionFull } from "@/features/agents/redux/builder-tier.thunks";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";

export function GiveToAgentDialog({
  toolId,
  toolName,
  onClose,
}: {
  toolId: string;
  toolName: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const agent = useAppSelector((s) => (agentId ? selectAgentById(s, agentId) : undefined));
  const agentName = useAgentName(agentId) ?? agent?.name;
  const has = Boolean(agent?.tools?.includes(toolId));

  // The agent's tool list is read fresh when one is picked, so "already on it" is true.
  const pick = (id: string) => {
    setAgentId(id);
    setLoading(true);
    setProblem(null);
    dispatch(fetchAgentExecutionFull(id))
      .unwrap()
      // The tool assignment checks the agent's model can use tools, so the model record is read first.
      .then(async () => {
        const modelId = selectAgentById(store.getState(), id)?.modelId;
        if (modelId) await getModelRecords().loadModel(modelId);
      })
      .catch((cause: unknown) => setProblem(extractErrorMessage(cause, "This agent could not be loaded. Pick another.")))
      .finally(() => setLoading(false));
  };

  async function change(add: boolean) {
    if (!agentId) return;
    setSaving(true);
    setProblem(null);
    try {
      await dispatch(
        applyOwnedAgentToolDelta({ agentId, addToolIds: add ? [toolId] : [], removeToolIds: add ? [] : [toolId] }),
      ).unwrap();
      toast.success(add ? `${toolName} is on ${agentName ?? "your agent"}` : `${toolName} removed from ${agentName ?? "your agent"}`);
    } catch (cause) {
      setProblem(extractErrorMessage(cause, "That didn't save. Try again."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" data-give-to-agent="">
        <DialogHeader>
          <DialogTitle className="truncate">Give {toolName} to an agent</DialogTitle>
          <DialogDescription>{agentName ? `Giving it to ${agentName}` : "Pick one of your agents."}</DialogDescription>
        </DialogHeader>
        <AgentListInlinePicker
          consumerId="tools-home-give-to-agent"
          onSelect={pick}
          initialTab="mine"
          visibleTabs={["mine"]}
          autoFocusSearch={false}
          className="h-72 rounded-lg border border-border bg-background"
        />
        {problem ? (
          <p role="alert" className="flex items-center gap-1 text-sm text-destructive">
            {problem}
            <ErrorAlchemyMenu error={problem} />
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
          {has ? (
            <Button variant="outline" disabled={saving || loading} onClick={() => void change(false)} icon={<Check className="h-4 w-4" />}>
              On this agent · Remove
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={!agentId || saving || loading}
              onClick={() => void change(true)}
              icon={saving || loading ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
            >
              Give to agent
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
