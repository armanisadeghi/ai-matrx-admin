import type { AppDispatch } from "@/lib/redux/store";
import { callApi } from "@/lib/api/call-api";

export interface ExportConversation {
  key: string;
  title: string;
  provider: string;
  turns: number;
  userWords: number;
}

export interface ExportProject {
  key: string;
  name: string;
  hasInstructions: boolean;
  files: string[];
}

export interface ExportPreview {
  conversations: ExportConversation[];
  projects: ExportProject[];
  notes: string[];
}

export interface ClaudeCodeDraft {
  draftId: string;
  task: string;
  hasClaudeMd: boolean;
  skills: string[];
  exampleCount: number;
  hasNotes: boolean;
  examples: { input: string; output: string }[];
}

type ApiResult = { data?: unknown; error?: { message?: string } };

/** List the conversations and projects in an uploaded or pasted export (aidream `/agent-studio/import/preview`). */
export async function previewExport(
  dispatch: AppDispatch,
  source: { file_id: string } | { text: string },
): Promise<ExportPreview> {
  const result = (await dispatch(
    callApi({ path: "/agent-studio/import/preview" as never, method: "POST", body: source as never }),
  )) as ApiResult;
  if (result.error) throw new Error(result.error.message ?? "We couldn't read that export. Try again.");
  const data = (result.data ?? {}) as {
    conversations?: { key: string; title: string; provider: string; turns: number; user_words: number }[];
    projects?: { key: string; name: string; has_instructions: boolean; files: string[] }[];
    notes?: string[];
  };
  const conversations = (data.conversations ?? []).map((c) => ({
    key: c.key,
    title: c.title,
    provider: c.provider,
    turns: c.turns,
    userWords: c.user_words,
  }));
  if (conversations.length === 0) {
    throw new Error(
      "We couldn't find any conversations in that. Upload the whole zip or the conversations file inside it, or paste a chat.",
    );
  }
  return {
    conversations,
    projects: (data.projects ?? []).map((p) => ({
      key: p.key,
      name: p.name,
      hasInstructions: p.has_instructions,
      files: p.files,
    })),
    notes: data.notes ?? [],
  };
}

/** What Claude Code sent, as the person's own draft (aidream `/agent-studio/import/draft/{id}`). */
export async function readDraft(dispatch: AppDispatch, draftId: string): Promise<ClaudeCodeDraft> {
  const result = (await dispatch(
    callApi({ path: `/agent-studio/import/draft/${encodeURIComponent(draftId)}` as never, method: "GET" as never }),
  )) as ApiResult;
  if (result.error) throw new Error(result.error.message ?? "We couldn't open that draft. Run the export again.");
  const d = (result.data ?? {}) as {
    draft_id: string;
    task: string;
    has_claude_md: boolean;
    skills: string[];
    example_count: number;
    has_notes: boolean;
    examples: { input: string; output: string }[];
  };
  return {
    draftId: d.draft_id,
    task: d.task,
    hasClaudeMd: d.has_claude_md,
    skills: d.skills ?? [],
    exampleCount: d.example_count,
    hasNotes: d.has_notes,
    examples: d.examples ?? [],
  };
}
