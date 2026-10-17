/**
 * The table a person chose for one Tool's rows — remembered per Tool per person in
 * `users.user_preferences.preferences.tools.resultTables.<toolId>` (the same row connections use).
 */
import { useCallback, useEffect, useState } from "react";
import { asJsonObject, mergeJsonColumn } from "@ai-matrx/data/db";

import { createClient } from "@/utils/supabase/client";

export type ToolTableBinding = {
  tableId: string;
  tableName: string | null;
  /** Add every successful run to the table without being asked (off until the person turns it on). */
  auto: boolean;
};

const table = () => createClient().schema("users").from("user_preferences");

function readBinding(preferences: unknown, toolId: string): ToolTableBinding | null {
  const tools = asJsonObject(asJsonObject(preferences).tools);
  const entry = asJsonObject(asJsonObject(tools.resultTables)[toolId]);
  return typeof entry.tableId === "string"
    ? { tableId: entry.tableId, tableName: typeof entry.tableName === "string" ? entry.tableName : null, auto: entry.auto === true }
    : null;
}

export async function loadToolTableBinding(userId: string, toolId: string): Promise<ToolTableBinding | null> {
  const { data, error } = await table().select("preferences").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return readBinding(data?.preferences, toolId);
}

export async function saveToolTableBinding(userId: string, toolId: string, binding: ToolTableBinding | null): Promise<void> {
  const outcome = await mergeJsonColumn<{ id: string; version: number; preferences: unknown }>({
    fetchCurrent: () => table().select("id, version, preferences").eq("user_id", userId).maybeSingle(),
    readColumn: (row) => row.preferences,
    merge: (current) => {
      const tools = asJsonObject(current.tools);
      const resultTables = { ...asJsonObject(tools.resultTables) };
      if (binding) resultTables[toolId] = { ...binding, savedAt: new Date().toISOString() };
      else delete resultTables[toolId];
      return { ...current, tools: { ...tools, resultTables } };
    },
    applyUpdate: ({ value, expectedVersion, nextVersion }) =>
      table()
        .update({ preferences: value, version: nextVersion })
        .eq("user_id", userId)
        .eq("version", expectedVersion)
        .select("id, version, preferences")
        .maybeSingle(),
  });
  if (outcome.status !== "saved") throw new Error("That table could not be remembered. Try again.");
}

export function useToolTableBinding(userId: string | null, toolId: string | null) {
  const [binding, setBinding] = useState<ToolTableBinding | null>(null);
  const [ready, setReady] = useState(false);
  /** The remembered table could not be read: saving now could overwrite it, so the bar says so instead. */
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!userId || !toolId) return;
    let live = true;
    loadToolTableBinding(userId, toolId)
      .then((b) => live && (setBinding(b), setLoadFailed(false), setReady(true)))
      .catch(() => live && (setLoadFailed(true), setReady(true)));
    return () => {
      live = false;
    };
  }, [userId, toolId]);

  const save = useCallback(
    async (next: ToolTableBinding | null) => {
      if (!userId || !toolId) return;
      await saveToolTableBinding(userId, toolId, next);
      setBinding(next);
    },
    [userId, toolId],
  );

  return { binding, ready, loadFailed, save };
}
