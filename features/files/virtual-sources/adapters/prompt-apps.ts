/**
 * features/files/virtual-sources/adapters/prompt-apps.ts
 *
 * Prompt Apps virtual source. Mirror of the Agent Apps adapter against the
 * `prompt_apps` table.
 */

"use client";

import { Sparkles } from "lucide-react";
import { registerVirtualSource } from "@/features/files/virtual-sources/registry";
import { makeCodeInlinePreview } from "./CodeInlinePreview";
import type {
  ListArgs,
  RenameArgs,
  WriteArgs,
  VirtualContent,
  VirtualNode,
  VirtualSourceAdapter,
} from "@/features/files/virtual-sources/types";

const TAB_ID_PREFIX = "prompt-app:";

const COLUMNS =
  "id,name,slug,component_code,component_language,updated_at,status,description";

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

function mapLanguage(raw: string | null | undefined): string {
  const v = (raw ?? "tsx").toLowerCase();
  if (v === "react" || v === "tsx" || v === "jsx") return "typescript";
  return v;
}

const promptAppsAdapter: VirtualSourceAdapter = {
  sourceId: "prompt_apps",
  label: "Prompt Apps",
  icon: Sparkles,
  capabilities: {
    list: true,
    read: true,
    write: true,
    rename: true,
    delete: true,
    move: false,
    folders: false,
    binary: false,
    versions: false,
    multiField: false,
  },
  dnd: { acceptsOwn: false },
  pathPrefix: "/Prompt Apps",

  makeTabId(id) {
    return `${TAB_ID_PREFIX}${id}`;
  },
  parseTabId(tabId) {
    if (!tabId.startsWith(TAB_ID_PREFIX)) return null;
    const id = tabId.slice(TAB_ID_PREFIX.length);
    return id ? { id } : null;
  },

  async list(supabase, userId, args: ListArgs): Promise<VirtualNode[]> {
    if (!userId) return [];
    if (args.parentId !== null) return [];
    const { data, error } = await supabase
      .from("prompt_apps")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(args.limit ?? 200);
    if (error) return [];
    return ((data ?? []) as unknown as PromptAppRow[]).map((row) => ({
      id: row.id,
      kind: "file" as const,
      name: row.name,
      parentId: null,
      updatedAt: row.updated_at,
      extension: "tsx",
      language: mapLanguage(row.component_language),
      mimeType: "text/typescript",
      hasContent: !!row.component_code,
      badge:
        row.status && row.status !== "published" ? row.status : undefined,
    }));
  },

  async read(supabase, _userId, id): Promise<VirtualContent> {
    const { data, error } = await supabase
      .from("prompt_apps")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error || !data) throw new Error(`Prompt App not found: ${id}`);
    const row = data as unknown as PromptAppRow;
    return {
      id: row.id,
      name: `${row.slug || row.name}.tsx`,
      path: `prompt-app:/${row.slug || row.id}.tsx`,
      language: mapLanguage(row.component_language),
      mimeType: "text/typescript",
      content: row.component_code ?? "",
      updatedAt: row.updated_at,
    };
  },

  async write(supabase, _userId, args: WriteArgs) {
    let query = supabase
      .from("prompt_apps")
      .update({ component_code: args.content })
      .eq("id", args.id);
    if (args.expectedUpdatedAt) {
      query = query.eq("updated_at", args.expectedUpdatedAt);
    }
    const { data, error } = await query.select("updated_at").maybeSingle();
    if (error || !data) {
      throw new Error(error?.message ?? "Prompt App save failed (conflict?)");
    }
    return { updatedAt: (data as { updated_at: string }).updated_at };
  },

  async rename(supabase, userId, args: RenameArgs) {
    let query = supabase
      .from("prompt_apps")
      .update({
        name: args.newName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.id)
      .eq("user_id", userId);
    if (args.expectedUpdatedAt) {
      query = query.eq("updated_at", args.expectedUpdatedAt);
    }
    const { data, error } = await query.select("updated_at").maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Rename failed");
    return { updatedAt: (data as { updated_at: string }).updated_at };
  },

  async delete(supabase, userId, id) {
    const { error } = await supabase
      .from("prompt_apps")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
  },

  inlinePreview: makeCodeInlinePreview("prompt_apps"),

  openInRoute(node) {
    return `/code?tab=${encodeURIComponent(`${TAB_ID_PREFIX}${node.id}`)}`;
  },
};

registerVirtualSource(promptAppsAdapter);
