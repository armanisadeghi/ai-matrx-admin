/**
 * Surface manifest — AI Work Conversations (`matrx-user/ai-work-conversations`).
 *
 * `/work/conversations` (the canonical entity-list table over every accessible
 * conversation) and `/work/conversations/[conversationId]` (the ONE
 * provenance-labeled detail route — provider mirrors get the read-only
 * transcript, AI Matrx conversations get the provenance view plus a door to
 * runnable chat).
 *
 * Declared 2026-08-17: this route family had no surface declaration at all.
 *
 * Distinct from `matrx-user/chat`: that surface is a LIVE conversation the user
 * is talking in. This one is the browse-and-inspect view over conversations
 * from every source, including provider mirrors that cannot be continued here.
 *
 * Curated groups (band 0-899):
 *   listing        The table's current query state
 *   conversation   The one conversation open in the detail route
 *   provenance     Which system produced the open conversation
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";
import {
  CONVERSATION_LIST_GROUPS,
  CONVERSATION_LIST_VALUES,
  CONVERSATION_LIST_WRITE_TARGETS,
} from "./_ai-work-conversation-list.manifest";

export const AI_WORK_CONVERSATIONS_SURFACE_NAME = "matrx-user/ai-work-conversations";

const groups: SurfaceValueGroup[] = [
  ...CONVERSATION_LIST_GROUPS,
  {
    key: "conversation",
    label: "Open conversation",
    sortOrder: 200,
    description: "The single conversation open on the detail route.",
  },
  {
    key: "provenance",
    label: "Provenance",
    sortOrder: 300,
    description:
      "Which system produced the open conversation and whether it can be continued in AI Matrx.",
  },
];

const surfaceSpecific: SurfaceValue[] = [
  // ── Listing (the list route; shared with /work) ──────────────────────
  ...CONVERSATION_LIST_VALUES,

  // ── Open conversation ─────────────────────────────────────────────────
  {
    name: "conversation_id",
    label: "Conversation ID",
    description:
      "UUID of the conversation open on the detail route. Empty on the list route, where no single conversation is open.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 36,
    sortOrder: 200,
    group: "conversation",
  },
  {
    name: "conversation_title",
    label: "Conversation title",
    description:
      "Title of the open conversation as displayed. Empty when no conversation is open or the title has not resolved.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 70,
    sortOrder: 210,
    group: "conversation",
  },
  {
    name: "conversation_message_count",
    label: "Message count",
    description:
      "How many visible messages the open conversation's transcript holds. Absent when no conversation is open or the transcript has not loaded.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 4,
    sortOrder: 220,
    group: "conversation",
  },
  {
    name: "conversation_updated_at",
    label: "Last activity",
    description:
      "ISO timestamp of the open conversation's most recent activity. Empty when no conversation is open.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 25,
    sortOrder: 230,
    group: "conversation",
  },

  // ── Provenance ────────────────────────────────────────────────────────
  {
    name: "conversation_source",
    label: "Conversation source",
    description:
      'Which system produced the open conversation — "ai-matrx" for a native run, or the coding provider that was mirrored in. Empty when no conversation is open. Decides which detail view renders.',
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 16,
    sortOrder: 300,
    group: "provenance",
  },
  {
    name: "title_source",
    label: "Title source",
    description:
      "Which system authored the displayed title (the provider, AI Matrx, or the sync layer). Empty when no conversation is open. Stated beside the title so a generated title is never mistaken for the user's own.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 16,
    sortOrder: 310,
    group: "provenance",
  },
  {
    name: "is_continuable",
    label: "Continuable in AI Matrx",
    description:
      "True when the open conversation can be continued as a runnable AI Matrx chat; false for a read-only provider mirror. Absent when no conversation is open. An agent must not offer to continue a mirror.",
    valueType: "boolean",
    alwaysAvailable: false,
    typicalCharCount: 5,
    sortOrder: 320,
    group: "provenance",
  },
];

export const aiWorkConversationsManifest: SurfaceManifest = {
  situation:
    "They are browsing their conversations, {visible_conversation_count|no} shown of {conversation_total|all}; the one open is \"{conversation_title|none}\" with {conversation_message_count|no} messages. They can search and filter, rename or favorite conversations, and move them to the trash.",
  surfaceName: AI_WORK_CONVERSATIONS_SURFACE_NAME,
  inheritsFrom: "matrx-default/chat",
  client: "matrx-user",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description:
    "Browse and inspect every accessible conversation, native or mirrored.",
  label: "AI Work Conversations",
  urlPattern: "/work/conversations",
  intro: `<surface_intro>
You are on the AI Work conversations view: the browse-and-inspect surface over every conversation the user can access, from any source — native AI Matrx runs and mirrored coding-provider sessions alike. This is not a live chat; it is the record.
On the list route read conversation_list first: the page on screen, with ids. While conversations_loaded is false the list is loading (or load_error explains a failure) — never say the person has none. The list opens on the "chat" bucket; say so when a bucket, lane or search narrows it, and use list_view to reach rows that are not showing. update_conversations renames or favorites, delete_conversations moves to Trash; a new conversation is started at /work/new, not here. On the detail route the Open conversation group identifies one conversation and the Provenance group says which system produced it.
Respect is_continuable: a mirrored provider conversation is read-only here, so never offer to continue or reply to it. Respect title_source too — a title the sync layer generated is not something the user wrote.
</surface_intro>`,
  groups,
  writeTargets: CONVERSATION_LIST_WRITE_TARGETS,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
};

/** Type-safe payload helper. Every value on this surface is route-conditional. */
export function createAiWorkConversationsScope(values: {
  selection?: string;
  context?: Record<string, unknown>;
  list_scope?: string;
  audience_filter?: string;
  list_search?: string;
  visible_conversation_count?: number;
  conversation_id?: string;
  conversation_title?: string;
  conversation_message_count?: number;
  conversation_updated_at?: string;
  conversation_source?: string;
  title_source?: string;
  is_continuable?: boolean;
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
