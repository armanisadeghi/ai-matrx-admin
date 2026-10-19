"use client";

// DeclareAgentRecord — the record every page under /agents/[id] shows, declared to the current-record
// primitive WITH ITS NAME (features/shell/current-record/currentRecord.ts). The agent's header comes from
// the chat package and declares nothing, so the layout does: token + id at once, the name as soon as the
// hydrated agent lands in the store ("Add to my menu" then adds "QME Report…", never "Agent Builder").
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAgentById } from "@ai-matrx/chat/agents/redux/agent-definition/selectors";
import { useDeclareCurrentRecord } from "@/features/shell/current-record/currentRecord";

export function DeclareAgentRecord({ id }: { id: string }): null {
  const name = useAppSelector((state) => selectAgentById(state, id)?.name ?? null);
  useDeclareCurrentRecord({ token: "agent", id, label: name });
  return null;
}
