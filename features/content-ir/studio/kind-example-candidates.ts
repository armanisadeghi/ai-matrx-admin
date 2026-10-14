"use client";

/**
 * Real emissions of a kind, read from agent runs, offered as examples.
 *
 * `content_ir.kind_example_candidates` finds every object carrying this kind's
 * `__kind` (at any depth, so a child kind is found inside its parent) in the
 * assistant messages the viewer can read, validates each against the kind's
 * live schema and says whether it is already a saved example. Fetched only when
 * the panel opens.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import type { Json } from "@/types/database.types";

export interface KindExampleCandidate {
  messageId: string;
  conversationId: string;
  conversationTitle: string | null;
  agentId: string | null;
  emittedAt: string;
  data: Json;
  validation: "passed" | "failed" | string;
  alreadyExample: boolean;
}

export type CandidatesState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: KindExampleCandidate[] };

export function useKindExampleCandidates(
  kindDefinitionId: string,
  refreshKey: number,
): CandidatesState {
  const key = `${kindDefinitionId}:${refreshKey}`;
  const [loaded, setLoaded] = useState<{ key: string; value: CandidatesState } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .schema("content_ir")
        .rpc("kind_example_candidates", {
          p_kind_definition_id: kindDefinitionId,
          p_limit: 30,
        });
      if (cancelled) return;
      if (error) {
        setLoaded({
          key,
          value: { status: "error", message: `Failed to read agent runs: ${error.message}` },
        });
        return;
      }
      setLoaded({
        key,
        value: {
          status: "ready",
          rows: (data ?? []).map((r) => ({
            messageId: r.message_id,
            conversationId: r.conversation_id,
            conversationTitle: r.conversation_title,
            agentId: r.agent_id,
            emittedAt: r.emitted_at,
            data: r.data,
            validation: r.validation,
            alreadyExample: r.already_example,
          })),
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [kindDefinitionId, key]);

  return loaded && loaded.key === key ? loaded.value : { status: "loading" };
}

/** What a saved captured example records about where it came from. */
export function candidateSourceRef(candidate: KindExampleCandidate): Json {
  return {
    message_id: candidate.messageId,
    conversation_id: candidate.conversationId,
    agent_id: candidate.agentId,
    emitted_at: candidate.emittedAt,
  };
}
