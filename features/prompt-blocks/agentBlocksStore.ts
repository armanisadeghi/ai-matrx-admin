/**
 * What the builder knows about one agent's prompt blocks. The declared names are the agent's own
 * draft field (`promptBlocks`, saved with the agent, undoable); `missing` is the declared names that
 * resolve to nothing (the run would be refused, so the chip is red). Missing is shared per name set
 * so the system prompt and every message ask once.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { supabase } from "@/utils/supabase/client";
import { setAgentPromptBlocks } from "@/features/agents/redux/agent-builder.slice";
import { declaredNames, withDeclared, withoutDeclared } from "./tokens";

const missingByKey = new Map<string, string[]>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();
let version = 0;

function bump() {
  version++;
  listeners.forEach((l) => l());
}

async function missingAmong(names: readonly string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const { data, error } = await supabase
    .schema("agent")
    .from("prompt_block")
    .select("name")
    .in("name", names as string[])
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  const found = new Set((data ?? []).map((r) => r.name));
  return names.filter((n) => !found.has(n));
}

/** Forget what was learned (a block was created, edited or archived) and ask again. */
export function invalidateMissing(): void {
  missingByKey.clear();
  bump();
}

function ensureMissing(names: readonly string[]): void {
  const key = names.join("|");
  if (missingByKey.has(key) || inflight.has(key)) return;
  const job = missingAmong(names)
    .then((missing) => void missingByKey.set(key, missing))
    .catch(() => void missingByKey.set(key, []))
    .finally(() => {
      inflight.delete(key);
      bump();
    });
  inflight.set(key, job);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAgentBlocks(agentId: string | null | undefined) {
  const dispatch = useAppDispatch();
  const raw = useAppSelector((state) =>
    agentId ? (state.agentDefinition.agents[agentId] as { promptBlocks?: unknown } | undefined)?.promptBlocks : undefined,
  );
  const declaredList = useMemo(() => declaredNames(raw), [raw]);
  const key = declaredList.join("|");
  useSyncExternalStore(subscribe, () => version, () => 0);
  useEffect(() => {
    ensureMissing(declaredList);
  }, [key, declaredList]);
  const missing = missingByKey.get(key) ?? [];

  const declare = useCallback(
    async (name: string) => {
      if (!agentId) return;
      dispatch(setAgentPromptBlocks({ id: agentId, promptBlocks: withDeclared(raw, name) }));
    },
    [agentId, dispatch, raw],
  );
  const undeclare = useCallback(
    async (name: string) => {
      if (!agentId) return;
      dispatch(setAgentPromptBlocks({ id: agentId, promptBlocks: withoutDeclared(raw, name) }));
    },
    [agentId, dispatch, raw],
  );
  const refresh = useCallback(async () => invalidateMissing(), []);
  return { declared: declaredList, missing, declare, undeclare, refresh };
}
