"use client";

import { Lightbulb } from "lucide-react";
import { extensionForLanguage } from "@/features/code-files/actions/languageOptions";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LibrarySourceAdapter,
  LoadedSourceEntry,
  SaveSourceArgs,
  SaveSourceResult,
  SourceEntry,
} from "../types";
import { RemoteConflictError } from "../types";

// ---------------------------------------------------------------------------
// Tab id helpers — "prompt-app:<rowId>"
// ---------------------------------------------------------------------------

const PREFIX = "prompt-app:";

function parseTabId(tabId: string): { rowId: string } | null {
  if (!tabId.startsWith(PREFIX)) return null;
  const rowId = tabId.slice(PREFIX.length);
  return rowId ? { rowId } : null;
}

function makeTabId(rowId: string): string {
  return `${PREFIX}${rowId}`;
}

// ---------------------------------------------------------------------------
// Supabase shape — pull only the columns we actually need
// ---------------------------------------------------------------------------

interface PromptAppRow {
  id: string;
  name: string;
  slug: string;
  component_code: string;
  component_language: string | null;
  updated_at: string;
  status: string | null;
  description: string | null;
}

const COLUMNS =
  "id,name,slug,component_code,component_language,updated_at,status,description";

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export const promptAppsAdapter: LibrarySourceAdapter = {
  sourceId: "prompt_apps",
  label: "Prompt Apps",
  icon: Lightbulb,
  tabIdPrefix: PREFIX,
  multiField: false,

  parseTabId,
  makeTabId,

  async list(
    supabase: SupabaseClient,
    userId: string | null,
  ): Promise<SourceEntry[]> {
    if (!userId) return [];
    const { data, error } = await supabase
      .from("prompt_apps")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) throw error;
    const rows = (data ?? []) as unknown as PromptAppRow[];
    return rows.map((row) => ({
      rowId: row.id,
      name: row.name,
      description: row.description ?? undefined,
      updatedAt: row.updated_at,
      badge: row.status && row.status !== "published" ? row.status : undefined,
    }));
  },

  async load(
    supabase: SupabaseClient,
    rowId: string,
  ): Promise<LoadedSourceEntry> {
    const { data, error } = await supabase
      .from("prompt_apps")
      .select(COLUMNS)
      .eq("id", rowId)
      .single();

    if (error) throw error;
    const row = data as unknown as PromptAppRow;
    const language = mapLanguage(row.component_language);
    const ext = extensionForLanguage(language);
    return {
      rowId: row.id,
      name: `${safeFilename(row.slug || row.name)}.${ext}`,
      path: `prompt-app:/${row.slug || row.id}.${ext}`,
      language,
      content: row.component_code ?? "",
      updatedAt: row.updated_at,
    };
  },

  async save(
    supabase: SupabaseClient,
    args: SaveSourceArgs,
  ): Promise<SaveSourceResult> {
    let query = supabase
      .from("prompt_apps")
      .update({ component_code: args.content })
      .eq("id", args.rowId);

    if (args.expectedUpdatedAt) {
      // Optimistic guard — the UPDATE only applies if the row hasn't
      // been touched elsewhere since we loaded it.
      query = query.eq("updated_at", args.expectedUpdatedAt);
    }

    const { data, error } = await query.select("updated_at").maybeSingle();
    if (error) throw error;
    if (!data) {
      // No row matched the combined id + updated_at predicate.
      throw new RemoteConflictError("prompt_apps", args.rowId);
    }
    return { updatedAt: (data as { updated_at: string }).updated_at };
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapLanguage(raw: string | null | undefined): string {
  // The `component_language` column accepts "tsx" | "jsx" | "typescript" |
  // "javascript" | "html" | "react". "react" is legacy and maps to tsx.
  const v = (raw ?? "tsx").toLowerCase();
  if (v === "react") return "typescript";
  if (v === "tsx" || v === "jsx") return "typescript";
  return v;
}

function safeFilename(input: string): string {
  return input.replace(/[^\w\-.]/g, "_").slice(0, 80) || "prompt-app";
}
