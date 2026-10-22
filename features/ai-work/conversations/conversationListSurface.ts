// features/ai-work/conversations/conversationListSurface.ts
//
// The conversations list's agent surface. ONE list renders on two routes —
// /work (the AI Work overview, surface `matrx-user/ai-work`) and
// /work/conversations (`matrx-user/ai-work-conversations`) — so ONE pure
// builder emits the list's values from the controller the list already
// rendered (never a fetch), and each route names its own surface.
//
// Writes save through the list's own paths: the inline title edit
// (saveConversationTitle), the row star (setConversationFavorite) and the
// bulk Move to Trash (trashConversation, the conversation's own cascade).
// There is no create: a new conversation starts at /work/new.

import type { EntityListSurfaceController } from "@/lib/entity-list/components/EntityListPage";
import type {
  SurfaceWriteHandlerEntry,
  SurfaceWriteHandlers,
} from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  collectionWriteHandlers,
  readCollectionList,
} from "@ai-matrx/chat/surfaces/runtime/collection-write-targets";
import { refuseSurfaceWrite } from "@ai-matrx/chat/surfaces/runtime/surface-writeback";
import { xmlElement, xmlList } from "@ai-matrx/chat/surfaces/runtime/context-bundle";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { setConversationFavorite } from "@ai-matrx/chat/agents/redux/conversation-list/conversation-row-actions.thunks";
import { getStore } from "@/lib/redux/store-singleton";
import { makeScope, type ListScopeKind } from "@/lib/list-scope/types";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { conversationTitleText } from "@/features/content-ir/surfaces/kind-text-label";
import { appLabel } from "@ai-matrx/chat/agents/redux/conversation-history/source-registry";
import { saveConversationTitle } from "./service";
import { trashConversation } from "./bulkTrash";
import { conversationTypeLabel, providerLabel } from "./presentation";
import {
  applyAudience,
  CONVERSATION_AUDIENCES,
  CONVERSATION_LIST_SCOPES,
  readAudience,
  type ConversationBrowseRow,
} from "./types";

type Controller = EntityListSurfaceController<ConversationBrowseRow>;

const LIST_MAX_ROWS = 25;

const titleOf = (row: ConversationBrowseRow) =>
  conversationTitleText(row.title?.trim() || null) || "Untitled conversation";

/** The condensed page on screen — one XML bundle. */
export function buildConversationListBundle(list: Controller): string {
  return xmlList(
    "conversations",
    list.rows,
    (row) =>
      xmlElement("conversation", {
        id: row.id,
        title: titleOf(row),
        type: conversationTypeLabel(row.conversation_type, row.origin_class),
        app: row.source_app ? appLabel(row.source_app) : null,
        provider: row.provider ? (providerLabel(row.provider) ?? row.provider) : null,
        workspace: row.workspace_name || null,
        messages: row.message_count,
        last_active: row.last_activity_at ? formatRelativeTime(row.last_activity_at) : null,
        favorite: row.is_favorite || null,
        mine: row.is_owner,
        read_only_mirror: row.provider ? true : null,
      }),
    {
      maxRows: LIST_MAX_ROWS,
      attrs: {
        lane: list.query.scope.kind,
        bucket: readAudience(list.query.filters),
        matching: list.total,
        sort: `${list.view.sort} ${list.view.direction}`,
        search: list.query.search.trim() || null,
      },
    },
  );
}

/** The list's values — the same set on both routes that render it. */
export function buildConversationListValues(list: Controller): Record<string, unknown> {
  const loaded = !list.isLoading && !list.error;
  return {
    list_scope: list.query.scope.kind,
    audience_filter: readAudience(list.query.filters),
    list_search: list.query.search.trim(),
    conversations_loaded: loaded,
    selected_conversation_ids: list.selectedIds,
    ...(loaded
      ? {
          visible_conversation_count: list.rows.length,
          conversation_total: list.total,
          conversation_list: buildConversationListBundle(list),
          visible_conversations: list.rows.map((r) => ({
            id: r.id,
            title: titleOf(r),
            conversation_type: r.conversation_type,
            source_app: r.source_app,
            provider: r.provider,
            workspace_name: r.workspace_name,
            message_count: r.message_count,
            last_activity_at: r.last_activity_at,
            is_favorite: r.is_favorite,
            is_owner: r.is_owner,
          })),
        }
      : {}),
    ...(list.error ? { load_error: list.error.message } : {}),
  };
}

/** /work/conversations: its own surface's payload. */
export function buildConversationsPageScope(list: Controller): SurfaceScopePayload {
  return buildConversationListValues(list) as SurfaceScopePayload;
}

/** /work: the AI Work overview's payload — the list plus which hub route this is. */
export function buildWorkOverviewScope(list: Controller): SurfaceScopePayload {
  return { work_route: "overview", ...buildConversationListValues(list) } as SurfaceScopePayload;
}

// ── Writes ──────────────────────────────────────────────────────────────

interface UpdatePlan {
  row: ConversationBrowseRow;
  title?: string;
  favorite?: boolean;
}

function rowFor(list: Controller, target: string, raw: unknown, index: number): ConversationBrowseRow {
  const id =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string"
        ? (raw as { id: string }).id
        : null;
  if (!id) throw new Error(`${target}[${index}] needs the conversation's id.`);
  const row = list.rows.find((r) => r.id === id);
  if (!row)
    throw new Error(
      `${target}[${index}]: ${id} is not a conversation on screen. Use list_view to show it first, then read conversation_list again.`,
    );
  return row;
}

function parseUpdates(list: Controller, value: unknown): UpdatePlan[] {
  const target = "update_conversations";
  const items = readCollectionList(target, "conversations", value);
  const plans = items.map((raw, i) => {
    const row = rowFor(list, target, raw, i);
    const item = raw as { title?: unknown; favorite?: unknown };
    const plan: UpdatePlan = { row };
    if (item.title !== undefined) {
      if (typeof item.title !== "string" || !item.title.trim())
        throw new Error(`${target}[${i}].title must be non-empty text.`);
      if (item.title.trim().length > 200)
        throw new Error(`${target}[${i}].title is over 200 characters.`);
      plan.title = item.title.trim();
    }
    if (item.favorite !== undefined) {
      if (typeof item.favorite !== "boolean")
        throw new Error(`${target}[${i}].favorite must be true or false.`);
      if (!row.is_owner)
        throw new Error(`${target}[${i}]: "${titleOf(row)}" is shared with the person; only its owner can favorite it.`);
      plan.favorite = item.favorite;
    }
    if (plan.title === undefined && plan.favorite === undefined)
      throw new Error(`${target}[${i}] changes nothing — send title and/or favorite.`);
    return plan;
  });
  return plans;
}

function parseDeletes(list: Controller, value: unknown): ConversationBrowseRow[] {
  const target = "delete_conversations";
  return readCollectionList(target, "conversations", value).map((raw, i) => {
    const row = rowFor(list, target, raw, i);
    if (row.provider)
      throw new Error(
        `${target}[${i}]: "${titleOf(row)}" is linked to a coding session and cannot be moved to Trash from the list.`,
      );
    return row;
  });
}

async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const store = getStore();
  if (!store) throw new Error("The app is still starting — try again.");
  // Same thunk and same read of its result as the row star (useConversationRowActions).
  const result: unknown = await store.dispatch(
    setConversationFavorite({ conversationId: id, isFavorite }) as never,
  );
  if (setConversationFavorite.rejected.match(result))
    throw new Error(result.payload?.message ?? "The favorite was not changed.");
}

interface ListViewPlan {
  lane?: ListScopeKind;
  bucket?: (typeof CONVERSATION_AUDIENCES)[number] | "all";
  search?: string;
}

// The lane tabs the page renders: All and My team come from the shell, beside the declared scopes.
const VIEW_LANES: readonly ListScopeKind[] = ["all", "team", ...CONVERSATION_LIST_SCOPES];

function parseListView(value: unknown): ListViewPlan {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const plan: ListViewPlan = {};
  if (v.lane !== undefined) {
    if (typeof v.lane !== "string" || !(VIEW_LANES as readonly string[]).includes(v.lane))
      throw new Error(`list_view.lane must be one of ${VIEW_LANES.join(", ")}.`);
    plan.lane = v.lane as ListScopeKind;
  }
  if (v.bucket !== undefined) {
    const allowed = [...CONVERSATION_AUDIENCES, "all"] as string[];
    if (typeof v.bucket !== "string" || !allowed.includes(v.bucket))
      throw new Error(`list_view.bucket must be one of ${allowed.join(", ")}.`);
    plan.bucket = v.bucket as ListViewPlan["bucket"];
  }
  if (v.search !== undefined) {
    if (typeof v.search !== "string") throw new Error("list_view.search must be text.");
    plan.search = v.search.trim();
  }
  if (!plan.lane && !plan.bucket && plan.search === undefined)
    throw new Error("list_view changes nothing — send lane, bucket and/or search.");
  return plan;
}

function listViewHandler(list: Controller): SurfaceWriteHandlerEntry {
  return {
    validate: (value) => {
      parseListView(value);
    },
    apply: (value) => {
      const plan = parseListView(value);
      list.patchQuery({
        ...(plan.lane ? { scope: makeScope(plan.lane) } : {}),
        ...(plan.bucket ? { filters: applyAudience(list.query.filters, plan.bucket) } : {}),
        ...(plan.search !== undefined ? { search: plan.search } : {}),
      });
      return {
        summary:
          "The list now shows the requested view. Read conversation_list again once conversations_loaded is true.",
      };
    },
  };
}

/** update_conversations / delete_conversations / list_view — the same on both routes. */
export function buildConversationListWriteHandlers(list: Controller): SurfaceWriteHandlers {
  const handlers = collectionWriteHandlers(
    {
      plural: "conversations",
      singular: "conversation",
      update: {
        parse: (value) => parseUpdates(list, value),
        nameOf: (plan: UpdatePlan) => titleOf(plan.row),
        changedOf: (plan: UpdatePlan) => [
          ...(plan.title !== undefined ? ["title"] : []),
          ...(plan.favorite !== undefined ? ["favorite"] : []),
        ],
        run: async (plan: UpdatePlan) => {
          if (plan.title !== undefined) {
            await saveConversationTitle(plan.row.id, plan.title);
            list.patchRow(plan.row.id, { title: plan.title });
          }
          if (plan.favorite !== undefined) {
            await setFavorite(plan.row.id, plan.favorite);
            list.patchRow(plan.row.id, { is_favorite: plan.favorite });
          }
          return { id: plan.row.id, name: plan.title ?? titleOf(plan.row) };
        },
      },
      delete: {
        parse: (value) => parseDeletes(list, value),
        nameOf: (row: ConversationBrowseRow) => titleOf(row),
        run: async (row: ConversationBrowseRow) => {
          await trashConversation(row.id);
          list.removeRow(row.id);
          return { id: row.id, name: titleOf(row) };
        },
      },
    },
    refuseSurfaceWrite,
  );
  return { ...handlers, list_view: listViewHandler(list) };
}
