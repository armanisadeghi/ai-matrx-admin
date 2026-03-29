"use client";

// app/(ssr)/ssr/chat/_components/SsrSidebarChats.tsx
//
// SSR-specific version of SidebarChats that uses DOM CustomEvents
// instead of the deprecated AgentsContext sidebarEvents bus.
// The conversation client dispatches 'chat:conversationCreated' and
// 'chat:conversationUpdated' — this component listens for those.

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  MessageSquare,
  Share2,
  Users,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useSelector } from "react-redux";
import { selectUser } from "@/lib/redux/slices/userSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ShareModal } from "@/features/sharing";
import { supabase } from "@/utils/supabase/client";
import { useChatPersistence } from "@/features/cx-chat/hooks/useChatPersistence";
import type {
  CxConversationSummary,
  SharedCxConversationSummary,
} from "@/features/cx-chat/types/cx-tables";

interface SsrSidebarChatsProps {
  activeRequestId?: string | null;
  onSelectChat: (requestId: string) => void;
  onNewChat: () => void;
  searchQuery?: string;
  onCloseSidebar?: () => void;
}

function groupByTime(
  items: CxConversationSummary[],
): Record<string, CxConversationSummary[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const groups: Record<string, CxConversationSummary[]> = {};

  for (const item of items) {
    const date = new Date(item.updated_at || item.created_at);
    let group: string;

    if (date >= today) group = "Today";
    else if (date >= yesterday) group = "Yesterday";
    else if (date >= weekAgo) group = "This Week";
    else if (date >= monthAgo) group = "This Month";
    else group = "Older";

    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
  }

  return groups;
}

function InlineRename({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div className="flex items-center gap-1 w-full px-2 py-1">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onConfirm();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={onConfirm}
        className="flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded bg-background border border-primary/40 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        style={{ fontSize: "16px" }}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onConfirm();
        }}
        className="p-0.5 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"
      >
        <Check className="h-3 w-3" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        className="p-0.5 rounded text-muted-foreground hover:bg-muted"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function DeleteConfirm({
  label,
  onConfirm,
  onCancel,
}: {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 mx-1">
      <p className="text-[10px] text-destructive mb-1.5 leading-tight">
        Delete &ldquo;{label?.slice(0, 25) || "Untitled"}
        {(label?.length || 0) > 25 ? "..." : ""}&rdquo;?
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onConfirm();
          }}
          className="flex-1 px-2 py-0.5 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
        >
          Delete
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="flex-1 px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground hover:bg-accent transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ConversationItem({
  item,
  isActive,
  isRenaming,
  isDeleting,
  renameValue,
  onSelect,
  onStartRename,
  onRequestDelete,
  onRenameChange,
  onConfirmRename,
  onCancelRename,
  onConfirmDelete,
  onCancelDelete,
}: {
  item: CxConversationSummary;
  isActive: boolean;
  isRenaming: boolean;
  isDeleting: boolean;
  renameValue: string;
  onSelect: () => void;
  onStartRename: () => void;
  onRequestDelete: () => void;
  onRenameChange: (v: string) => void;
  onConfirmRename: () => void;
  onCancelRename: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (isDeleting) {
    return (
      <DeleteConfirm
        label={item.title || "Untitled Chat"}
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
      />
    );
  }

  if (isRenaming) {
    return (
      <InlineRename
        value={renameValue}
        onChange={onRenameChange}
        onConfirm={onConfirmRename}
        onCancel={onCancelRename}
      />
    );
  }

  const handleSelect = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      const agentId = new URLSearchParams(window.location.search).get("agent");
      const url = agentId
        ? `/ssr/chat/c/${item.id}?agent=${agentId}`
        : `/ssr/chat/c/${item.id}`;
      window.open(url, "_blank");
      return;
    }
    onSelect();
  };

  return (
    <>
      <div
        className={`relative group rounded-md transition-all duration-150 ${
          isActive
            ? "bg-accent/70 dark:bg-accent/50"
            : "hover:bg-accent/40 dark:hover:bg-accent/20"
        }`}
      >
        <div className="flex items-center">
          <button
            onClick={handleSelect}
            className="flex-1 min-w-0 px-2.5 py-1 text-left cursor-pointer"
          >
            <div
              className={`text-[11px] truncate leading-relaxed ${
                isActive ? "text-foreground font-medium" : "text-foreground/70"
              }`}
            >
              {item.title || "Untitled Chat"}
            </div>
          </button>
          <div className="flex-shrink-0 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32" sideOffset={4}>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShareOpen(true);
                  }}
                  className="text-[11px] py-1.5"
                >
                  <Share2 className="h-3 w-3 mr-2" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartRename();
                  }}
                  className="text-[11px] py-1.5"
                >
                  <Pencil className="h-3 w-3 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onRequestDelete();
                  }}
                  className="text-destructive focus:text-destructive text-[11px] py-1.5"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {isShareOpen && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          resourceType="cx_conversation"
          resourceId={item.id}
          resourceName={item.title || "Untitled Chat"}
          isOwner={true}
        />
      )}
    </>
  );
}

function SharedConversationItem({
  item,
  isActive,
  onSelect,
}: {
  item: SharedCxConversationSummary;
  isActive: boolean;
  onSelect: () => void;
}) {
  const levelLabel =
    item.permission_level === "admin"
      ? "Full access"
      : item.permission_level === "editor"
        ? "Can edit"
        : "View only";

  const handleSelect = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      const agentId = new URLSearchParams(window.location.search).get("agent");
      const url = agentId
        ? `/ssr/chat/c/${item.id}?agent=${agentId}`
        : `/ssr/chat/c/${item.id}`;
      window.open(url, "_blank");
      return;
    }
    onSelect();
  };

  return (
    <div
      className={`relative group rounded-md transition-all duration-150 ${
        isActive
          ? "bg-accent/70 dark:bg-accent/50"
          : "hover:bg-accent/40 dark:hover:bg-accent/20"
      }`}
    >
      <button
        onClick={handleSelect}
        className="w-full px-2.5 py-1 text-left cursor-pointer"
      >
        <div
          className={`text-[11px] truncate leading-relaxed ${
            isActive ? "text-foreground font-medium" : "text-foreground/70"
          }`}
        >
          {item.title || "Untitled Chat"}
        </div>
        <div className="text-[9px] text-muted-foreground truncate">
          {item.owner_email ? item.owner_email.split("@")[0] : "Unknown"} ·{" "}
          {levelLabel}
        </div>
      </button>
    </div>
  );
}

function SharedChatsSection({
  activeRequestId,
  onSelectChat,
  onCloseSidebar,
  searchQuery,
}: {
  activeRequestId?: string | null;
  onSelectChat: (requestId: string) => void;
  onCloseSidebar?: () => void;
  searchQuery: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [sharedChats, setSharedChats] = useState<SharedCxConversationSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (!isOpen || hasFetched) return;
    let cancelled = false;
    setIsLoading(true);

    (async () => {
      try {
        const response = await fetch("/api/cx-chat/shared");
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setSharedChats(data.conversations || []);
        }
      } catch {
        /* non-critical */
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setHasFetched(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, hasFetched]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return sharedChats;
    const q = searchQuery.toLowerCase();
    return sharedChats.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.owner_email?.toLowerCase().includes(q),
    );
  }, [sharedChats, searchQuery]);

  return (
    <div className="px-1 py-1 border-t border-border/50 mt-1">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 w-full px-2 py-1 text-left hover:bg-accent/30 rounded-md transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
        <Users className="h-3 w-3 text-secondary flex-shrink-0" />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">
          Shared with Me
        </span>
        {hasFetched && sharedChats.length > 0 && (
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
            {sharedChats.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="mt-0.5">
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-secondary rounded-full animate-spin" />
            </div>
          )}
          {!isLoading && filtered.length === 0 && hasFetched && (
            <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
              <Users className="h-4 w-4 text-muted-foreground/30 mb-1" />
              <p className="text-[10px] text-muted-foreground">
                {searchQuery
                  ? "No shared chats match your search"
                  : "No chats shared with you"}
              </p>
            </div>
          )}
          <div className="space-y-0.5">
            {filtered.map((item) => (
              <SharedConversationItem
                key={item.id}
                item={item}
                isActive={activeRequestId === item.id}
                onSelect={() => {
                  onSelectChat(item.id);
                  onCloseSidebar?.();
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SsrSidebarChats({
  activeRequestId,
  onSelectChat,
  onNewChat,
  searchQuery = "",
  onCloseSidebar,
}: SsrSidebarChatsProps) {
  const user = useSelector(selectUser);
  const isAuthenticated = !!user?.id;

  const [history, setHistory] = useState<CxConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { loadHistory, renameConversation, deleteConversation } =
    useChatPersistence();
  const realtimeSubscriptionRef = useRef<ReturnType<
    typeof supabase.channel
  > | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    const data = await loadHistory(100);
    setHistory(data);
    setIsLoading(false);
  }, [loadHistory]);

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchHistory();

    const subscription = supabase
      .channel("cx_conversations_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cx_conversation" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            fetchHistory();
          } else if (payload.eventType === "UPDATE") {
            setHistory((prev) =>
              prev.map((item) =>
                item.id === payload.new.id
                  ? {
                      ...item,
                      title: payload.new.title || item.title,
                      status: payload.new.status || item.status,
                      updated_at: payload.new.updated_at || item.updated_at,
                    }
                  : item,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setHistory((prev) =>
              prev.filter((item) => item.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    realtimeSubscriptionRef.current = subscription;

    return () => {
      if (realtimeSubscriptionRef.current) {
        supabase.removeChannel(realtimeSubscriptionRef.current);
      }
    };
  }, [fetchHistory, isAuthenticated]);

  // Listen for DOM CustomEvents dispatched by ChatConversationClient
  useEffect(() => {
    const handleCreated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string; title: string };
      setHistory((prev) => {
        if (prev.some((h) => h.id === detail.id)) return prev;
        return [
          {
            id: detail.id,
            title: detail.title,
            status: "active" as const,
            message_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    };

    const handleUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id: string };
      setHistory((prev) => {
        const index = prev.findIndex((h) => h.id === detail.id);
        if (index <= 0) return prev;
        const item = prev[index];
        return [
          { ...item, updated_at: new Date().toISOString() },
          ...prev.slice(0, index),
          ...prev.slice(index + 1),
        ];
      });
    };

    window.addEventListener("chat:conversationCreated", handleCreated);
    window.addEventListener("chat:conversationUpdated", handleUpdated);
    return () => {
      window.removeEventListener("chat:conversationCreated", handleCreated);
      window.removeEventListener("chat:conversationUpdated", handleUpdated);
    };
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter((h) => h.title?.toLowerCase().includes(q));
  }, [history, searchQuery]);

  const grouped = useMemo(() => groupByTime(filtered), [filtered]);

  const handleStartRename = useCallback((id: string, currentLabel: string) => {
    setRenamingId(id);
    setRenameValue(currentLabel || "");
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const success = await renameConversation(renamingId, renameValue.trim());
    if (success) {
      setHistory((prev) =>
        prev.map((h) =>
          h.id === renamingId ? { ...h, title: renameValue.trim() } : h,
        ),
      );
    }
    setRenamingId(null);
    setRenameValue("");
  }, [renamingId, renameValue, renameConversation]);

  const handleCancelRename = useCallback(() => {
    setRenamingId(null);
    setRenameValue("");
  }, []);

  const handleRequestDelete = useCallback((id: string) => {
    setDeletingId(id);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingId) return;
    const success = await deleteConversation(deletingId);
    if (success) {
      setHistory((prev) => prev.filter((h) => h.id !== deletingId));
      if (activeRequestId === deletingId) onNewChat();
    }
    setDeletingId(null);
  }, [deletingId, deleteConversation, activeRequestId, onNewChat]);

  const handleCancelDelete = useCallback(() => {
    setDeletingId(null);
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
        <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
        <p className="text-[11px] text-muted-foreground">
          Sign in to save chats
        </p>
      </div>
    );
  }

  return (
    <div className="px-1 py-1">
      <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">
        Chats
      </div>

      {isLoading && history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mb-2" />
          <p className="text-[10px] text-muted-foreground">Loading...</p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
          <MessageSquare className="h-5 w-5 text-muted-foreground/30 mb-1.5" />
          <p className="text-[10px] text-muted-foreground">
            No conversations yet
          </p>
        </div>
      )}

      {!isLoading && filtered.length === 0 && searchQuery && (
        <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
          <Search className="h-4 w-4 text-muted-foreground/30 mb-1.5" />
          <p className="text-[10px] text-muted-foreground">No results</p>
        </div>
      )}

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="mb-1.5">
          <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">
            {section}
          </div>
          <div className="space-y-0.5">
            {items.map((item) => (
              <ConversationItem
                key={item.id}
                item={item}
                isActive={activeRequestId === item.id}
                isRenaming={renamingId === item.id}
                isDeleting={deletingId === item.id}
                renameValue={renameValue}
                onSelect={() => {
                  onSelectChat(item.id);
                  onCloseSidebar?.();
                }}
                onStartRename={() =>
                  handleStartRename(item.id, item.title || "")
                }
                onRequestDelete={() => handleRequestDelete(item.id)}
                onRenameChange={setRenameValue}
                onConfirmRename={handleConfirmRename}
                onCancelRename={handleCancelRename}
                onConfirmDelete={handleConfirmDelete}
                onCancelDelete={handleCancelDelete}
              />
            ))}
          </div>
        </div>
      ))}

      <SharedChatsSection
        activeRequestId={activeRequestId}
        onSelectChat={onSelectChat}
        onCloseSidebar={onCloseSidebar}
        searchQuery={searchQuery}
      />
    </div>
  );
}
