'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    MoreHorizontal, Pencil, Trash2, Check, X,
    Search, MessageSquare,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/redux/slices/userSlice';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useChatPersistence } from '../../hooks/useChatPersistence';
import type { CxConversationSummary } from '../../types/cx-tables';

// ============================================================================
// TYPES
// ============================================================================

interface SidebarChatsProps {
    activeRequestId?: string | null;
    onSelectChat: (requestId: string) => void;
    onNewChat: () => void;
    searchQuery?: string;
    onCloseSidebar?: () => void;
}

// ============================================================================
// HELPER: Group conversations by time
// ============================================================================

function groupByTime(items: CxConversationSummary[]): Record<string, CxConversationSummary[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const groups: Record<string, CxConversationSummary[]> = {};

    for (const item of items) {
        const date = new Date(item.updated_at || item.created_at);
        let group: string;

        if (date >= today) {
            group = 'Today';
        } else if (date >= yesterday) {
            group = 'Yesterday';
        } else if (date >= weekAgo) {
            group = 'This Week';
        } else if (date >= monthAgo) {
            group = 'This Month';
        } else {
            group = 'Older';
        }

        if (!groups[group]) groups[group] = [];
        groups[group].push(item);
    }

    return groups;
}

// ============================================================================
// INLINE RENAME
// ============================================================================

function InlineRename({
    value, onChange, onConfirm, onCancel,
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
                    if (e.key === 'Enter') { e.preventDefault(); onConfirm(); }
                    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
                }}
                onBlur={onConfirm}
                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs rounded bg-background border border-primary/40 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                style={{ fontSize: '16px' }}
            />
            <button onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                className="p-0.5 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                <Check className="h-3 w-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onCancel(); }}
                className="p-0.5 rounded text-muted-foreground hover:bg-muted">
                <X className="h-3 w-3" />
            </button>
        </div>
    );
}

// ============================================================================
// DELETE CONFIRMATION
// ============================================================================

function DeleteConfirm({
    label, onConfirm, onCancel,
}: {
    label: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="px-2 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20 mx-1">
            <p className="text-[10px] text-destructive mb-1.5 leading-tight">
                Delete &ldquo;{label?.slice(0, 25) || 'Untitled'}{(label?.length || 0) > 25 ? '...' : ''}&rdquo;?
            </p>
            <div className="flex items-center gap-1.5">
                <button onClick={(e) => { e.stopPropagation(); onConfirm(); }}
                    className="flex-1 px-2 py-0.5 text-[10px] font-medium rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                    Delete
                </button>
                <button onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    className="flex-1 px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground hover:bg-accent transition-colors">
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// CONVERSATION ITEM
// ============================================================================

function ConversationItem({
    item, isActive, isRenaming, isDeleting,
    renameValue, onSelect, onStartRename, onRequestDelete,
    onRenameChange, onConfirmRename, onCancelRename,
    onConfirmDelete, onCancelDelete,
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
    if (isDeleting) {
        return <DeleteConfirm
            label={item.title || 'Untitled Chat'}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
        />;
    }

    if (isRenaming) {
        return <InlineRename
            value={renameValue}
            onChange={onRenameChange}
            onConfirm={onConfirmRename}
            onCancel={onCancelRename}
        />;
    }

    return (
        <div className={`relative group rounded-md transition-all duration-150 ${
            isActive ? 'bg-accent/70 dark:bg-accent/50' : 'hover:bg-accent/40 dark:hover:bg-accent/20'
        }`}>
            <div className="flex items-center">
                <button onClick={onSelect} className="flex-1 min-w-0 px-2.5 py-1 text-left">
                    <div className={`text-[11px] truncate leading-relaxed ${
                        isActive ? 'text-foreground font-medium' : 'text-foreground/70'
                    }`}>
                        {item.title || 'Untitled Chat'}
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
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStartRename(); }}
                                className="text-[11px] py-1.5">
                                <Pencil className="h-3 w-3 mr-2" />Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
                                className="text-destructive focus:text-destructive text-[11px] py-1.5">
                                <Trash2 className="h-3 w-3 mr-2" />Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// SIDEBAR CHATS
// ============================================================================

export function SidebarChats({
    activeRequestId,
    onSelectChat,
    onNewChat,
    searchQuery = '',
    onCloseSidebar,
}: SidebarChatsProps) {
    const user = useSelector(selectUser);
    const isAuthenticated = !!user?.id;

    const [history, setHistory] = useState<CxConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { loadHistory, renameConversation, deleteConversation } = useChatPersistence();

    // Load history on mount
    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        const data = await loadHistory(100);
        setHistory(data);
        setIsLoading(false);
    }, [loadHistory]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return history;
        const q = searchQuery.toLowerCase();
        return history.filter(h => h.title?.toLowerCase().includes(q));
    }, [history, searchQuery]);

    const grouped = useMemo(() => groupByTime(filtered), [filtered]);

    // Rename handlers
    const handleStartRename = useCallback((id: string, currentLabel: string) => {
        setRenamingId(id);
        setRenameValue(currentLabel || '');
    }, []);

    const handleConfirmRename = useCallback(async () => {
        if (!renamingId || !renameValue.trim()) {
            setRenamingId(null);
            return;
        }
        const success = await renameConversation(renamingId, renameValue.trim());
        if (success) {
            setHistory(prev => prev.map(h =>
                h.id === renamingId ? { ...h, title: renameValue.trim() } : h
            ));
        }
        setRenamingId(null);
        setRenameValue('');
    }, [renamingId, renameValue, renameConversation]);

    const handleCancelRename = useCallback(() => {
        setRenamingId(null);
        setRenameValue('');
    }, []);

    // Delete handlers
    const handleRequestDelete = useCallback((id: string) => {
        setDeletingId(id);
    }, []);

    const handleConfirmDelete = useCallback(async () => {
        if (!deletingId) return;
        const success = await deleteConversation(deletingId);
        if (success) {
            setHistory(prev => prev.filter(h => h.id !== deletingId));
            if (activeRequestId === deletingId) {
                onNewChat();
            }
        }
        setDeletingId(null);
    }, [deletingId, deleteConversation, activeRequestId, onNewChat]);

    const handleCancelDelete = useCallback(() => {
        setDeletingId(null);
    }, []);

    // Guest state
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30 mb-2" />
                <p className="text-[11px] text-muted-foreground">Sign in to save chats</p>
            </div>
        );
    }

    // No flex-1/overflow — parent scrollable container handles that
    return (
        <div className="px-1 py-1">
            {/* Section header */}
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
                    <p className="text-[10px] text-muted-foreground">No conversations yet</p>
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
                    <div className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider select-none">
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
                                onStartRename={() => handleStartRename(item.id, item.title || '')}
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
        </div>
    );
}

export default SidebarChats;
