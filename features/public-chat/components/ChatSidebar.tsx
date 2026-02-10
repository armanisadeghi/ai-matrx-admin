'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    Plus, Search, X, MoreHorizontal, Pencil, Trash2,
    Check, MessageSquare, ChevronDown, PanelLeftClose, PanelLeft,
    Sparkles
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChatPersistence } from '../hooks/useChatPersistence';
import type { CxRequestSummary } from '../types/cx-tables';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

// ============================================================================
// TYPES
// ============================================================================

interface ChatSidebarProps {
    activeRequestId?: string | null;
    onSelectChat: (requestId: string) => void;
    onNewChat: () => void;
    className?: string;
}

// ============================================================================
// HELPER: Group conversations by time
// ============================================================================

function groupByTime(items: CxRequestSummary[]): Record<string, CxRequestSummary[]> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);
    const monthAgo = new Date(today.getTime() - 30 * 86400000);

    const groups: Record<string, CxRequestSummary[]> = {};

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
    item: CxRequestSummary;
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
            label={item.label || 'Untitled Chat'}
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
        <div className={`relative group rounded-lg transition-all duration-150 ${
            isActive ? 'bg-accent/80 dark:bg-accent/50' : 'hover:bg-accent/40 dark:hover:bg-accent/20'
        }`}>
            <div className="flex items-center">
                <button onClick={onSelect} className="flex-1 min-w-0 px-2.5 py-1.5 text-left">
                    <div className={`text-[11px] truncate leading-relaxed ${
                        isActive ? 'text-primary font-medium' : 'text-foreground/80 font-light'
                    }`}>
                        {item.label || 'Untitled Chat'}
                    </div>
                </button>
                <div className="flex-shrink-0 pr-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36" sideOffset={4}>
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
// CHAT SIDEBAR
// ============================================================================

export function ChatSidebar({ activeRequestId, onSelectChat, onNewChat, className = '' }: ChatSidebarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [history, setHistory] = useState<CxRequestSummary[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const { loadHistory, renameRequest, deleteRequest } = useChatPersistence();

    // Load history on mount and when sidebar opens
    const fetchHistory = useCallback(async () => {
        setIsLoading(true);
        const data = await loadHistory(100);
        setHistory(data);
        setIsLoading(false);
    }, [loadHistory]);

    useEffect(() => {
        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, fetchHistory]);

    // Also load once on mount for desktop
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!search.trim()) return history;
        const q = search.toLowerCase();
        return history.filter(h => h.label?.toLowerCase().includes(q));
    }, [history, search]);

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
        const success = await renameRequest(renamingId, renameValue.trim());
        if (success) {
            setHistory(prev => prev.map(h =>
                h.id === renamingId ? { ...h, label: renameValue.trim() } : h
            ));
        }
        setRenamingId(null);
        setRenameValue('');
    }, [renamingId, renameValue, renameRequest]);

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
        const success = await deleteRequest(deletingId);
        if (success) {
            setHistory(prev => prev.filter(h => h.id !== deletingId));
            if (activeRequestId === deletingId) {
                onNewChat();
            }
        }
        setDeletingId(null);
    }, [deletingId, deleteRequest, activeRequestId, onNewChat]);

    const handleCancelDelete = useCallback(() => {
        setDeletingId(null);
    }, []);

    // Toggle sidebar
    const toggleSidebar = useCallback(() => {
        setIsOpen(prev => !prev);
    }, []);

    // Sidebar content (shared between mobile overlay and desktop panel)
    const sidebarContent = (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Chats</span>
                </div>
                <button onClick={toggleSidebar} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors md:hidden">
                    <X className="h-4 w-4" />
                </button>
            </div>

            {/* New Chat Button */}
            <div className="px-2 pt-2 pb-1">
                <button
                    onClick={() => { onNewChat(); setIsOpen(false); }}
                    className="flex items-center justify-center w-full px-2 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition-all duration-200 active:scale-[0.98]"
                >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />New Chat
                </button>
            </div>

            {/* Search */}
            <div className="px-2 py-1">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg bg-muted/50 text-foreground placeholder:text-muted-foreground outline-none focus:bg-muted/80 transition-colors border-0"
                        style={{ fontSize: '16px', boxShadow: 'none' }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            <X className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-none px-1 py-1">
                {isLoading && history.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin mb-2" />
                        <p className="text-[11px] text-muted-foreground">Loading chats...</p>
                    </div>
                )}

                {!isLoading && filtered.length === 0 && !search && (
                    <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
                        <MessageSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-[11px] text-muted-foreground">No conversations yet</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Start a new chat to begin</p>
                    </div>
                )}

                {!isLoading && filtered.length === 0 && search && (
                    <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
                        <Search className="h-6 w-6 text-muted-foreground/40 mb-2" />
                        <p className="text-[11px] text-muted-foreground">No results for &ldquo;{search}&rdquo;</p>
                    </div>
                )}

                {Object.entries(grouped).map(([section, items]) => (
                    <div key={section} className="mb-2">
                        <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider select-none">
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
                                    onSelect={() => { onSelectChat(item.id); setIsOpen(false); }}
                                    onStartRename={() => handleStartRename(item.id, item.label || '')}
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
        </div>
    );

    return (
        <>
            {/* Toggle button - always visible */}
            <button
                onClick={toggleSidebar}
                className={`fixed top-12 left-2 z-30 p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 ${
                    isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                } ${className}`}
                title="Open chat history"
            >
                <PanelLeft className="h-4 w-4" />
            </button>

            {/* Mobile overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsOpen(false)}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div
                        className="absolute left-0 top-0 bottom-0 w-72 bg-card border-r border-border shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {sidebarContent}
                    </div>
                </div>
            )}

            {/* Desktop panel */}
            <div className={`hidden md:block fixed left-0 top-10 bottom-0 w-64 bg-card border-r border-border z-30 transform transition-transform duration-200 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}>
                {sidebarContent}
            </div>

            {/* Desktop close button */}
            {isOpen && (
                <button
                    onClick={toggleSidebar}
                    className="hidden md:flex fixed top-12 z-40 p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
                    style={{ left: '258px' }}
                    title="Close sidebar"
                >
                    <PanelLeftClose className="h-4 w-4" />
                </button>
            )}
        </>
    );
}

export default ChatSidebar;
