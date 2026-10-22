/**
 * The conversations list's shared vocabulary — ONE list renders on /work
 * (`matrx-user/ai-work`) and /work/conversations
 * (`matrx-user/ai-work-conversations`), so both manifests declare these same
 * values and write targets from here.
 *
 * Emitter: `features/ai-work/conversations/conversationListSurface.ts`
 * (passed to EntityListPage by `ConversationsBrowse.tsx`).
 */

import type {
  SurfaceValue,
  SurfaceValueGroup,
  SurfaceWriteTarget,
} from "@ai-matrx/chat/surfaces/types";

export const CONVERSATION_LIST_GROUPS: SurfaceValueGroup[] = [
  {
    key: "listing",
    label: "Conversation listing",
    sortOrder: 100,
    description:
      "The page of conversations on screen (condensed bundle + rows) and the lane, bucket and search deciding it.",
  },
  {
    key: "changes",
    label: "Changes",
    sortOrder: 150,
    description: "Rename, favorite or move conversations to Trash.",
  },
];

export const CONVERSATION_LIST_VALUES: SurfaceValue[] = [
  {
    name: "conversations_loaded",
    label: "Conversations loaded",
    description:
      "True once the list has loaded. False while loading and after a failure — then the row values are absent and `load_error` explains why. Never tell the person they have no conversations while this is false.",
    valueType: "boolean",
    alwaysAvailable: true,
    typicalCharCount: 5,
    sortOrder: 90,
    group: "listing",
  },
  {
    name: "conversation_list",
    label: "Conversation list",
    description:
      "The page on screen as one XML bundle: <conversations lane bucket matching sort search> with one <conversation id title type app provider workspace messages last_active favorite mine read_only_mirror/> per row (first 25). The ids are the ones update_conversations / delete_conversations take. Absent until loaded.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 3500,
    sortOrder: 95,
    group: "listing",
  },
  {
    name: "list_scope",
    label: "List scope",
    description:
      'Which lane the table shows: "all", "mine", "team", "orgs" or "shared". Always present.',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 6,
    sortOrder: 100,
    group: "listing",
  },
  {
    name: "audience_filter",
    label: "Bucket",
    description:
      '"chat" (AI chats a person started — the default), "external" (runs mirrored from outside coding apps), "internal" (runs the platform started for itself), "all", or "custom" for a hand-built filter. Always present.',
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 8,
    sortOrder: 110,
    group: "listing",
  },
  {
    name: "list_search",
    label: "Search text",
    description: "The search box text over titles, ids, session ids and commits. Empty when not searching.",
    valueType: "string",
    alwaysAvailable: true,
    typicalCharCount: 30,
    sortOrder: 120,
    group: "listing",
  },
  {
    name: "visible_conversation_count",
    label: "Rows on this page",
    description: "How many conversation rows the current page shows. Absent until loaded.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 3,
    sortOrder: 130,
    group: "listing",
  },
  {
    name: "conversation_total",
    label: "Matching conversations",
    description: "How many conversations match the lane, bucket and search across all pages. Absent until loaded.",
    valueType: "number",
    alwaysAvailable: false,
    typicalCharCount: 5,
    sortOrder: 135,
    group: "listing",
  },
  {
    name: "visible_conversations",
    label: "Visible conversation rows",
    description:
      "The rows on screen as { id, title, conversation_type, source_app, provider, workspace_name, message_count, last_activity_at, is_favorite, is_owner }. Absent until loaded. Bindable lookup; conversation_list is the summary to read.",
    valueType: "array",
    alwaysAvailable: false,
    typicalCharCount: 5000,
    autoContext: false,
    sortOrder: 140,
    group: "listing",
  },
  {
    name: "selected_conversation_ids",
    label: "Ticked conversations",
    description: "Ids of the rows the person ticked, in tick order. Always present; [] when none.",
    valueType: "array",
    alwaysAvailable: true,
    typicalCharCount: 80,
    sortOrder: 145,
    group: "listing",
  },
  {
    name: "load_error",
    label: "Load error",
    description: "Why the list failed to load, in the words the page shows. Absent unless it failed.",
    valueType: "string",
    alwaysAvailable: false,
    typicalCharCount: 120,
    sortOrder: 150,
    group: "listing",
  },
];

export const CONVERSATION_LIST_WRITE_TARGETS: SurfaceWriteTarget[] = [
  {
    name: "list_view",
    label: "List view",
    description:
      'Changes WHICH conversations the list shows — nothing is saved. Value is a JSON OBJECT with any of { lane?: "all" | "mine" | "team" | "orgs" | "shared", bucket?: "chat" | "external" | "internal" | "all", search?: string ("" clears it) }, e.g. { "bucket": "external", "search": "deploy" }. conversation_list holds only the page on screen, so switch the view to reach rows that are not showing; read conversation_list again once conversations_loaded is true.',
    valueType: "object",
    updatesValue: "audience_filter",
    mode: "ui",
    applyPolicy: "auto",
    group: "listing",
    sortOrder: 90,
  },
  {
    name: "update_conversations",
    label: "Rename or favorite conversations",
    description:
      'Renames and/or favorites conversations on screen (ids from conversation_list), saved immediately. Value is a JSON ARRAY of 1-25 objects, each { id: string (required), title?: string (1-200 characters), favorite?: boolean }. Only the person\'s own conversations (mine="true") can be favorited. An id not on screen, an empty title or an item that changes nothing refuses the whole list with nothing changed.',
    valueType: "array",
    updatesValue: "conversation_list",
    mode: "entity",
    applyPolicy: "ask",
    group: "changes",
    sortOrder: 120,
  },
  {
    name: "delete_conversations",
    label: "Move conversations to Trash",
    description:
      "Moves conversations on screen to Trash (ids from conversation_list), with their messages; restorable from Trash. Value is a JSON ARRAY of ids (or { id } objects). A conversation linked to a coding session (read_only_mirror) cannot be trashed here and refuses the whole list, with nothing changed.",
    valueType: "array",
    updatesValue: "conversation_list",
    mode: "entity",
    applyPolicy: "ask",
    group: "changes",
    sortOrder: 130,
  },
];
