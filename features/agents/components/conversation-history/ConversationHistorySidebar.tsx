"use client";

/**
 * ConversationHistorySidebar — reusable, scoped conversation sidebar.
 *
 * The sidebar is fully decoupled from any specific route or feature:
 * - A `scopeId` identifies the per-scope state in the
 *   `conversationHistory` Redux slice. Multiple consumers can mount with
 *   the same `scopeId` and share state.
 * - `agentIds` controls which agents' conversations are shown. Pass `[]`
 *   to fetch across all of the user's accessible agents.
 * - Grouping, pagination, search, and favorites are all UI-level concerns
 *   handled inside this component. Consumers provide: an active
 *   conversation id (for highlighting), an `onOpenConversation` callback,
 *   and the favorites handlers (since favorites live in the consumer's
 *   preference shape — see `useCodeWorkspaceHistory` for a reference
 *   implementation used by /code).
 *
 * Self-contained data-loading: the component triggers the initial fetch
 * on mount (and whenever `agentIds` changes) via
 * `fetchConversationHistory`. Consumers don't need to prewire a thunk.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Cpu,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageCircle,
  Search,
  Star,
  StarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchConversationHistory } from "@/features/agents/redux/conversation-history/thunks";
import {
  makeSelectConversationHistoryScope,
  makeSelectConversationHistoryStatus,
  makeSelectGroupedByAgent,
  makeSelectGroupedByDate,
} from "@/features/agents/redux/conversation-history/selectors";
import {
  setScopeAgentIds,
  setScopeGrouping,
  setScopeSearch,
} from "@/features/agents/redux/conversation-history/slice";
import type { HistoryGrouping } from "@/features/agents/redux/conversation-history/types";
import type { ConversationListItem } from "@/features/agents/redux/conversation-list/conversation-list.types";

export interface ConversationHistorySidebarProps {
  /** Unique scope key (same across mounts that should share state). */
  scopeId: string;
  /**
   * Agents whose conversations appear here. Empty = show all accessible
   * conversations for the user. The component manages fetches on change.
   */
  agentIds: string[];
  /** Active conversation (used for highlight). */
  activeConversationId?: string | null;
  /** Called when a row is clicked. Required for interactivity. */
  onOpenConversation?: (conv: ConversationListItem) => void;

  /** Default grouping when the scope is first created. Default: "date". */
  defaultGrouping?: HistoryGrouping;
  /** Page size passed to the fetch thunk. Default: 30. */
  pageSize?: number;

  /** Returns whether a given conversation is a favorite. */
  isFavorite?: (conversationId: string) => boolean;
  /** Called when the user toggles the star on a row. */
  onToggleFavorite?: (conv: ConversationListItem) => void;

  /** Content rendered above the list when no filter/agents are in scope. */
  emptyState?: React.ReactNode;
  /** Content rendered at the very top of the sidebar header row. */
  headerSlot?: React.ReactNode;
  /** Extra header actions (shown next to grouping + search toggles). */
  headerActions?: React.ReactNode;

  /**
   * Controls whether the built-in search input is shown. Consumers that
   * host their own search can hide it. Default: true.
   */
  showSearch?: boolean;
  /**
   * Controls whether the built-in grouping toggle is shown. Consumers can
   * hide it when the grouping is locked. Default: true.
   */
  showGroupingToggle?: boolean;

  className?: string;
}

// ── Layout constants (match features/code/styles/tokens where possible) ──────

const ROW_BG = "hover:bg-neutral-200/70 dark:hover:bg-neutral-800/60";
const ACTIVE_ROW_BG =
  "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50";

export const ConversationHistorySidebar: React.FC<
  ConversationHistorySidebarProps
> = ({
  scopeId,
  agentIds,
  activeConversationId,
  onOpenConversation,
  defaultGrouping = "date",
  pageSize = 30,
  isFavorite,
  onToggleFavorite,
  emptyState,
  headerSlot,
  headerActions,
  showSearch = true,
  showGroupingToggle = true,
  className,
}) => {
  const dispatch = useAppDispatch();

  // ── Stable selector instances per scopeId ──────────────────────────────────
  const selectScope = useMemo(
    () => makeSelectConversationHistoryScope(scopeId),
    [scopeId],
  );
  const selectByDate = useMemo(
    () => makeSelectGroupedByDate(scopeId),
    [scopeId],
  );
  const selectByAgent = useMemo(
    () => makeSelectGroupedByAgent(scopeId),
    [scopeId],
  );
  const selectStatus = useMemo(
    () => makeSelectConversationHistoryStatus(scopeId),
    [scopeId],
  );

  const scope = useAppSelector(selectScope);
  const byDate = useAppSelector(selectByDate);
  const byAgent = useAppSelector(selectByAgent);
  const { status, hasMore, error, count } = useAppSelector(selectStatus);

  const grouping = scope.grouping ?? defaultGrouping;
  const searchTerm = scope.searchTerm;

  // ── Sync scope config + trigger fetch on agent set changes ──────────────────
  const agentIdsKey = useMemo(
    () => agentIds.slice().sort().join(","),
    [agentIds],
  );
  const firstRunRef = useRef(true);

  useEffect(() => {
    dispatch(
      setScopeAgentIds({
        scopeId,
        agentIds: agentIds.slice(),
      }),
    );
    void dispatch(
      fetchConversationHistory({
        scopeId,
        agentIds: agentIds.slice(),
        pageSize,
        replace: true,
      }),
    );
    firstRunRef.current = false;
  }, [dispatch, scopeId, agentIdsKey, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onSearchChange = useCallback(
    (value: string) => {
      dispatch(setScopeSearch({ scopeId, searchTerm: value }));
    },
    [dispatch, scopeId],
  );

  const onGroupingChange = useCallback(
    (next: HistoryGrouping) => {
      dispatch(setScopeGrouping({ scopeId, grouping: next }));
    },
    [dispatch, scopeId],
  );

  const onLoadMore = useCallback(() => {
    if (!hasMore || status === "loading" || status === "loading-more") return;
    void dispatch(
      fetchConversationHistory({
        scopeId,
        replace: false,
      }),
    );
  }, [dispatch, scopeId, hasMore, status]);

  const favorites = useMemo(() => {
    if (!isFavorite) return [] as ConversationListItem[];
    return scope.items.filter((i) => isFavorite(i.conversationId));
  }, [scope.items, isFavorite]);

  const empty =
    status !== "loading" && count === 0 && !searchTerm.trim() && emptyState;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      {headerSlot}

      {/* ── Controls row: search + grouping toggle + actions ─────────────── */}
      {(showSearch || showGroupingToggle || headerActions) && (
        <div className="flex shrink-0 items-center gap-1 border-b border-neutral-200 px-2 py-1 dark:border-neutral-800">
          {showSearch && (
            <div className="relative flex min-w-0 flex-1 items-center">
              <Search
                size={12}
                className="absolute left-1.5 text-neutral-400"
                aria-hidden
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search conversations"
                className={cn(
                  "h-6 w-full rounded-sm border border-neutral-200 bg-white pl-5 pr-1.5 text-[11px] text-neutral-700 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none",
                  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500",
                )}
                aria-label="Search conversations"
              />
            </div>
          )}
          {showGroupingToggle && (
            <GroupingToggle value={grouping} onChange={onGroupingChange} />
          )}
          {headerActions}
        </div>
      )}

      {/* ── Main list ────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && (
          <div className="px-3 py-3 text-[11px] text-red-500">{error}</div>
        )}

        {status === "loading" && count === 0 && (
          <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-neutral-500">
            <Loader2 size={12} className="animate-spin" />
            Loading conversations…
          </div>
        )}

        {empty && <div className="px-1 py-2">{empty}</div>}

        {favorites.length > 0 && (
          <Section
            id="favorites"
            label="Favorites"
            count={favorites.length}
            icon={<Star size={11} className="text-amber-500" />}
            defaultOpen
          >
            {favorites.map((conv) => (
              <Row
                key={`fav-${conv.conversationId}`}
                conv={conv}
                active={conv.conversationId === activeConversationId}
                onOpen={onOpenConversation}
                isFavorite={isFavorite?.(conv.conversationId) ?? false}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </Section>
        )}

        {grouping === "date" &&
          byDate.map((bucket) => (
            <Section
              key={bucket.key}
              id={bucket.key}
              label={bucket.label}
              count={bucket.items.length}
              icon={<CalendarDays size={11} />}
              defaultOpen
            >
              {bucket.items.map((conv) => (
                <Row
                  key={conv.conversationId}
                  conv={conv}
                  active={conv.conversationId === activeConversationId}
                  onOpen={onOpenConversation}
                  isFavorite={isFavorite?.(conv.conversationId) ?? false}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </Section>
          ))}

        {grouping === "agent" &&
          byAgent.map((bucket) => (
            <Section
              key={bucket.agentId ?? "unknown"}
              id={bucket.agentId ?? "unknown"}
              label={bucket.label}
              count={bucket.items.length}
              icon={<Cpu size={11} />}
              defaultOpen
            >
              {bucket.items.map((conv) => (
                <Row
                  key={conv.conversationId}
                  conv={conv}
                  active={conv.conversationId === activeConversationId}
                  onOpen={onOpenConversation}
                  isFavorite={isFavorite?.(conv.conversationId) ?? false}
                  onToggleFavorite={onToggleFavorite}
                  showAgentHint={false}
                />
              ))}
            </Section>
          ))}

        {hasMore && (
          <div className="px-2 py-2">
            <button
              type="button"
              onClick={onLoadMore}
              disabled={status === "loading-more"}
              className={cn(
                "flex h-6 w-full items-center justify-center rounded-sm border border-neutral-200 text-[11px] text-neutral-700 hover:bg-neutral-100 disabled:opacity-60",
                "dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800",
              )}
            >
              {status === "loading-more" ? (
                <>
                  <Loader2 size={11} className="mr-1 animate-spin" />
                  Loading…
                </>
              ) : (
                "Load more"
              )}
            </button>
          </div>
        )}

        {!hasMore && count > 0 && (
          <div className="px-3 py-2 text-center text-[10px] text-neutral-400 dark:text-neutral-600">
            {count} conversation{count === 1 ? "" : "s"}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────────

interface GroupingToggleProps {
  value: HistoryGrouping;
  onChange: (next: HistoryGrouping) => void;
}

const GroupingToggle: React.FC<GroupingToggleProps> = ({ value, onChange }) => {
  return (
    <div
      role="tablist"
      aria-label="Group conversations by"
      className="flex h-6 items-stretch rounded-sm border border-neutral-200 dark:border-neutral-700"
    >
      <ToggleBtn
        active={value === "date"}
        onClick={() => onChange("date")}
        title="Group by date"
        aria-label="Group by date"
      >
        <CalendarDays size={11} />
      </ToggleBtn>
      <ToggleBtn
        active={value === "agent"}
        onClick={() => onChange("agent")}
        title="Group by agent"
        aria-label="Group by agent"
      >
        <Cpu size={11} />
      </ToggleBtn>
    </div>
  );
};

const ToggleBtn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }
> = ({ active, className, children, ...rest }) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    className={cn(
      "flex items-center justify-center px-1.5 text-neutral-600 first:rounded-l-sm last:rounded-r-sm hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
      active &&
        "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50",
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

interface SectionProps {
  id: string;
  label: string;
  count: number;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  label,
  count,
  icon,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="sticky top-0 z-[1] flex w-full items-center gap-1 bg-white px-2 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-700 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:text-neutral-200"
      >
        {open ? (
          <ChevronDown size={10} className="shrink-0" />
        ) : (
          <ChevronRight size={10} className="shrink-0" />
        )}
        {icon}
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 text-neutral-400 dark:text-neutral-500">
          {count}
        </span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
};

interface RowProps {
  conv: ConversationListItem;
  active: boolean;
  onOpen?: (conv: ConversationListItem) => void;
  isFavorite: boolean;
  onToggleFavorite?: (conv: ConversationListItem) => void;
  showAgentHint?: boolean;
}

const Row: React.FC<RowProps> = ({
  conv,
  active,
  onOpen,
  isFavorite,
  onToggleFavorite,
  showAgentHint = true,
}) => {
  const title = conv.title?.trim() || untitled(conv);
  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-2 text-[12px]",
        "h-6 cursor-pointer",
        ROW_BG,
        active && ACTIVE_ROW_BG,
      )}
      onClick={() => onOpen?.(conv)}
    >
      <MessageCircle
        size={11}
        className="shrink-0 text-neutral-400 dark:text-neutral-500"
      />
      <span className="min-w-0 flex-1 truncate">{title}</span>
      <span className="shrink-0 text-[10px] text-neutral-500 dark:text-neutral-400">
        {formatRelative(conv.updatedAt)}
      </span>
      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(conv);
          }}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm opacity-0 group-hover:opacity-100",
            isFavorite && "opacity-100",
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          {isFavorite ? (
            <Star size={11} className="text-amber-500" fill="currentColor" />
          ) : (
            <StarOff size={11} className="text-neutral-400" />
          )}
        </button>
      )}
      {showAgentHint && conv.agentId && (
        <span className="sr-only">agent {conv.agentId}</span>
      )}
    </div>
  );
};

function untitled(conv: ConversationListItem): string {
  return `Conversation ${conv.conversationId.slice(0, 6)}`;
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return "";
  const t = +new Date(iso);
  if (Number.isNaN(t)) return "";
  const now = Date.now();
  const diffMs = now - t;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const d = new Date(t);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default ConversationHistorySidebar;
