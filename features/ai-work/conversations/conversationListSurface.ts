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
  collectProblems,
  ProblemList,
  readCollectionList,
  repeatsProblem,
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

const rawId = (raw: unknown): string | null =>
  typeof raw === "string"
    ? raw
    : raw && typeof raw === "object" && typeof (raw as { id?: unknown }).id === "string"
      ? (raw as { id: string }).id
      : null;

/** The on-screen row an item names. */
function rowFor(list: Controller, target: string, raw: unknown, index: number): ConversationBrowseRow {
  const id = rawId(raw);
  if (!id) throw new Error(`${target}[${index}] needs the conversation's id.`);
  const row = list.rows.find((r) => r.id === id);
  if (!row)
    throw new Error(
      `${target}[${index}]: ${id} is not a conversation on screen. Use list_view to show it first, then read conversation_list again.`,
    );
  return row;
}

const UPDATE_KEYS = ["id", "title", "favorite"] as const;

/** Every problem across the whole list, reported at once (never the first only). */
function parseUpdates(list: Controller, value: unknown): UpdatePlan[] {
  const target = "update_conversations";
  const items = readCollectionList(target, "conversations", value);
  return collectProblems(
    target,
    items,
    (raw, i): UpdatePlan => {
      const where = `${target}[${i}]`;
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error(`${where} must be an object like { "id": "…", "title": "…" }; received ${JSON.stringify(raw)}.`);
      const item = raw as Record<string, unknown>;
      const problems = new ProblemList(where);
      const unknownKeys = Object.keys(item).filter(
        (k) => !(UPDATE_KEYS as readonly string[]).includes(k),
      );
      if (unknownKeys.length > 0)
        problems.add(`${where} does not accept ${unknownKeys.join(", ")}. Allowed keys: ${UPDATE_KEYS.join(", ")}.`);
      const row = problems.check(() => rowFor(list, target, raw, i));
      const plan: Partial<UpdatePlan> = {};
      if (item.title !== undefined) {
        if (typeof item.title !== "string" || !item.title.trim())
          problems.add(`${where}.title must be non-empty text.`);
        else if (item.title.trim().length > 200)
          problems.add(`${where}.title is over 200 characters.`);
        else plan.title = item.title.trim();
      }
      if (item.favorite !== undefined) {
        if (typeof item.favorite !== "boolean")
          problems.add(`${where}.favorite must be true or false.`);
        else if (row && !row.is_owner)
          problems.add(`${where}: "${titleOf(row)}" is shared with the person; only its owner can favorite it.`);
        else plan.favorite = item.favorite;
      }
      if (item.title === undefined && item.favorite === undefined)
        problems.add(`${where} changes nothing — send title and/or favorite.`);
      problems.throwIfAny();
      return { ...plan, row: row! };
    },
    {
      listChecks: (checked) => [
        repeatsProblem(target, checked.map((it) => rawId(it.raw)), "conversation id"),
      ],
    },
  );
}

const DELETE_KEYS = ["id"] as const;

function parseDeletes(list: Controller, value: unknown): ConversationBrowseRow[] {
  const target = "delete_conversations";
  const items = readCollectionList(target, "conversations", value);
  return collectProblems(
    target,
    items,
    (raw, i) => {
      const where = `${target}[${i}]`;
      const problems = new ProblemList(where);
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const unknownKeys = Object.keys(raw).filter(
          (k) => !(DELETE_KEYS as readonly string[]).includes(k),
        );
        if (unknownKeys.length > 0)
          problems.add(`${where} does not accept ${unknownKeys.join(", ")}. Send the id alone.`);
      }
      const row = problems.check(() => rowFor(list, target, raw, i));
      if (row?.provider)
        problems.add(
          `${where}: "${titleOf(row)}" is linked to a coding session and cannot be moved to Trash from the list.`,
        );
      problems.throwIfAny();
      return row!;
    },
    {
      listChecks: (checked) => [
        repeatsProblem(target, checked.map((it) => rawId(it.raw)), "conversation id"),
      ],
    },
  );
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

const LIST_VIEW_KEYS = ["lane", "bucket", "search"] as const;

/** Every problem at once; an unknown key is refused, never ignored. */
export function parseListView(value: unknown): ListViewPlan {
  const where = "list_view";
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${where} expects an OBJECT like { "lane": "mine", "search": "" }; received ${JSON.stringify(value)}.`);
  const v = value as Record<string, unknown>;
  const problems = new ProblemList(where);
  const unknownKeys = Object.keys(v).filter(
    (k) => !(LIST_VIEW_KEYS as readonly string[]).includes(k),
  );
  if (unknownKeys.length > 0)
    problems.add(`${where} does not accept ${unknownKeys.join(", ")}. Allowed keys: ${LIST_VIEW_KEYS.join(", ")}.`);
  const plan: ListViewPlan = {};
  if (v.lane !== undefined) {
    if (typeof v.lane !== "string" || !(VIEW_LANES as readonly string[]).includes(v.lane))
      problems.add(`${where}.lane must be one of ${VIEW_LANES.join(", ")}; received ${JSON.stringify(v.lane)}.`);
    else plan.lane = v.lane as ListScopeKind;
  }
  if (v.bucket !== undefined) {
    const allowed = [...CONVERSATION_AUDIENCES, "all"] as string[];
    if (typeof v.bucket !== "string" || !allowed.includes(v.bucket))
      problems.add(`${where}.bucket must be one of ${allowed.join(", ")}; received ${JSON.stringify(v.bucket)}.`);
    else plan.bucket = v.bucket as ListViewPlan["bucket"];
  }
  if (v.search !== undefined) {
    if (typeof v.search !== "string") problems.add(`${where}.search must be text ("" clears it).`);
    else plan.search = v.search.trim();
  }
  problems.throwIfAny();
  if (!plan.lane && !plan.bucket && plan.search === undefined)
    throw new Error(`${where} changes nothing — send lane, bucket and/or search.`);
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
