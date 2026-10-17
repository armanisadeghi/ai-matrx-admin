"use client";

/**
 * THE HUMAN GATE, inline on a record's own page. Asks the server for every run waiting on a
 * `decision` question ABOUT this record (`GET /runs/gates`) — authorized by the record, so
 * any editor of it sees and answers the gate, whoever started the run — and resumes the run
 * through the one `/runs/{id}/resume` door. Renders nothing when no gate is waiting.
 */

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck } from "lucide-react";
import type { paths } from "@ai-matrx/api/types";
import { useAppDispatch } from "@/lib/redux/hooks";
import { callApi } from "@/lib/api/call-api";
import { useWorkflowRunControls } from "../hooks/useWorkflowRunControls";
import { DecisionPanel } from "./DecisionPanel";
import { parseDecisionSpec } from "./interrupt-view";

interface OpenGate {
  run_id: string;
  checkpoint_id: string;
  title: string | null;
  prompt: string | null;
  decision: Record<string, unknown> | null;
}

/** Re-ask while the gate panel itself is on screen: a gate opens when a background run reaches it. */
const GATE_POLL_MS = 15_000;

export const openGatesKey = (entityType: string, entityId: string) => ["workflow", "open-gates", entityType, entityId];

/** The open gates on a record. Shared by the panel and by hosts that show the gate elsewhere (a button, a dialog). */
export function useOpenGates(
  entityType: string,
  entityId: string,
  /** `poll`: re-ask every 15s — only while someone is looking at the gate (the panel). A host that
   *  only shows a door to it reads once, and again on focus (no background polling). */
  { poll = false }: { poll?: boolean } = {},
) {
  const dispatch = useAppDispatch();
  return useQuery({
    queryKey: openGatesKey(entityType, entityId),
    queryFn: async (): Promise<OpenGate[]> => {
      const result = await dispatch(
        callApi({
          path: "/runs/gates" as keyof paths,
          method: "GET",
          queryParams: { entity_type: entityType, entity_id: entityId },
          expectedErrorStatuses: [401],
        } as never),
      );
      if (result.error) throw new Error(result.error.message ?? "Could not check for decisions waiting here.");
      const data = result.data as { gates?: OpenGate[] } | undefined;
      return Array.isArray(data?.gates) ? data.gates : [];
    },
    refetchInterval: poll ? GATE_POLL_MS : false,
    refetchIntervalInBackground: false,
    staleTime: poll ? 0 : 60_000,
  });
}

export function HumanGatePanel({
  entityType,
  entityId,
  onAnswered,
  bare = false,
}: {
  entityType: string;
  entityId: string;
  onAnswered?: () => void;
  /** The host (a dialog) already draws the frame: render without the panel's own border, tint and padding. */
  bare?: boolean;
}) {
  const queryClient = useQueryClient();
  const { answerInterrupt } = useWorkflowRunControls();
  const [sending, setSending] = useState(false);
  const queryKey = openGatesKey(entityType, entityId);
  const gates = useOpenGates(entityType, entityId, { poll: true });
  const gate = gates.data?.[0];
  const spec = gate ? parseDecisionSpec(gate.decision) : null;
  if (!gate || !spec || !gate.checkpoint_id) return null;

  const submit = (value: Record<string, unknown>) => {
    setSending(true);
    void answerInterrupt(gate.run_id, gate.checkpoint_id, value)
      .then((ok) => {
        if (ok) {
          void queryClient.invalidateQueries({ queryKey });
          onAnswered?.();
        }
      })
      .finally(() => setSending(false));
  };

  return (
    <section
      data-human-gate={gate.run_id}
      className={bare ? undefined : "rounded-xl border border-primary/40 bg-primary/5 p-3"}
      aria-label={gate.title ?? "Decision needed"}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <UserCheck className="size-4 text-primary" />
        {gate.title ?? "Decision needed"}
      </h3>
      {gate.prompt ? <p className="mt-0.5 text-xs text-muted-foreground">{gate.prompt}</p> : null}
      <DecisionPanel key={gate.checkpoint_id} spec={spec} sending={sending} onSubmit={submit} />
    </section>
  );
}
