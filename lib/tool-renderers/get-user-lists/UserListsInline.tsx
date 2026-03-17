"use client";

import React, { useMemo } from "react";
import { List, CheckSquare, Lock, Globe, Users, Search, ChevronRight } from "lucide-react";
import { ToolRendererProps } from "../types";
import { ToolCallObject } from "@/lib/redux/socket-io/socket.types";

interface UserList {
    id: string;
    list_name: string;
    description: string | null;
    user_id: string;
    is_public: boolean | null;
    authenticated_read: boolean;
    public_read: boolean;
    created_at: string;
    updated_at: string;
    item_count: number;
}

interface ParsedListsData {
    lists: UserList[];
    page: number;
    page_size: number;
    count: number;
    search_term?: string;
    isLoading: boolean;
    isComplete: boolean;
    isError: boolean;
}

function parseListsData(toolUpdates: ToolCallObject[]): ParsedListsData {
    const inputUpdate = toolUpdates.find((u) => u.type === "mcp_input");
    const args = inputUpdate?.mcp_input?.arguments ?? {};
    const search_term = typeof args.search_term === "string" ? args.search_term : undefined;

    const errorUpdate = toolUpdates.find((u) => u.type === "mcp_error");
    if (errorUpdate) {
        return { lists: [], page: 1, page_size: 10, count: 0, search_term, isLoading: false, isComplete: true, isError: true };
    }

    // Try mcp_output first (streaming path)
    const outputUpdate = toolUpdates.find((u) => u.type === "mcp_output");
    if (outputUpdate?.mcp_output) {
        const rawResult = outputUpdate.mcp_output.result;
        let result: { lists?: UserList[]; page?: number; page_size?: number; count?: number } | null = null;

        if (typeof rawResult === "object" && rawResult !== null) {
            result = rawResult as typeof result;
        } else if (typeof rawResult === "string") {
            try { result = JSON.parse(rawResult); } catch { /* ignore */ }
        }

        if (result?.lists) {
            return {
                lists: result.lists,
                page: result.page ?? 1,
                page_size: result.page_size ?? 10,
                count: result.count ?? result.lists.length,
                search_term,
                isLoading: false,
                isComplete: true,
                isError: false,
            };
        }
    }

    // Try step_data / tool_event path (streaming events contain tool_completed)
    const stepUpdates = toolUpdates.filter((u) => u.type === "step_data");
    for (const step of stepUpdates) {
        const sd = step.step_data;
        if (!sd) continue;
        // tool_completed event has data.result.lists
        const content = sd.content as Record<string, unknown>;
        const nested = content?.data as Record<string, unknown> | undefined;
        const result = (content?.result ?? nested?.result) as { lists?: UserList[]; page?: number; page_size?: number; count?: number } | undefined;
        if (result?.lists) {
            return {
                lists: result.lists,
                page: result.page ?? 1,
                page_size: result.page_size ?? 10,
                count: result.count ?? result.lists.length,
                search_term,
                isLoading: false,
                isComplete: true,
                isError: false,
            };
        }
    }

    const isComplete = toolUpdates.some((u) => u.type === "mcp_output" || u.type === "mcp_error");
    return { lists: [], page: 1, page_size: 10, count: 0, search_term, isLoading: !isComplete, isComplete, isError: false };
}

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return iso;
    }
}

function getVisibilityInfo(list: UserList): { label: string; icon: React.ReactNode; color: string } {
    if (list.is_public || list.public_read) {
        return { label: "Public", icon: <Globe className="w-3 h-3" />, color: "text-success" };
    }
    if (list.authenticated_read) {
        return { label: "Users", icon: <Users className="w-3 h-3" />, color: "text-info" };
    }
    return { label: "Private", icon: <Lock className="w-3 h-3" />, color: "text-muted-foreground" };
}

export const UserListsInline: React.FC<ToolRendererProps> = ({
    toolUpdates,
    currentIndex,
    onOpenOverlay,
    toolGroupId = "default",
}) => {
    const visibleUpdates = currentIndex !== undefined ? toolUpdates.slice(0, currentIndex + 1) : toolUpdates;

    const data = useMemo(() => parseListsData(visibleUpdates), [visibleUpdates]);

    if (data.isLoading) {
        return (
            <div className="space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <List className="w-4 h-4 animate-pulse" />
                    <span>Fetching your lists...</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (data.isError || (!data.isLoading && data.lists.length === 0 && data.isComplete)) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
                <List className="w-4 h-4" />
                <span>{data.isError ? "Failed to fetch lists." : "No lists found."}</span>
            </div>
        );
    }

    const displayLists = data.lists.slice(0, 5);
    const remaining = data.count - displayLists.length;

    return (
        <div className="space-y-3">
            {/* Stats bar */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground animate-in fade-in">
                <span className="flex items-center gap-1">
                    <List className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium text-foreground">{data.count}</span>
                    {data.count === 1 ? " list" : " lists"}
                </span>
                {data.search_term && (
                    <span className="flex items-center gap-1">
                        <Search className="w-3 h-3" />
                        <span className="italic">&ldquo;{data.search_term}&rdquo;</span>
                    </span>
                )}
                <span className="ml-auto">Page {data.page}</span>
            </div>

            {/* List cards */}
            <div className="space-y-2">
                {displayLists.map((list, index) => {
                    const vis = getVisibilityInfo(list);
                    return (
                        <div
                            key={list.id}
                            className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors animate-in fade-in slide-in-from-left"
                            style={{
                                animationDelay: `${index * 60}ms`,
                                animationDuration: "250ms",
                                animationFillMode: "backwards",
                            }}
                        >
                            {/* Icon */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center mt-0.5">
                                <CheckSquare className="w-4 h-4 text-primary" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground truncate">{list.list_name}</p>
                                    <span className="flex-shrink-0 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                        <span className={vis.color}>{vis.icon}</span>
                                    </span>
                                </div>
                                {list.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{list.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {list.item_count} {list.item_count === 1 ? "item" : "items"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatDate(list.created_at)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View all button */}
            {onOpenOverlay && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenOverlay(`tool-group-${toolGroupId}`);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer animate-in fade-in slide-in-from-bottom"
                    style={{
                        animationDelay: `${displayLists.length * 60}ms`,
                        animationDuration: "250ms",
                        animationFillMode: "backwards",
                    }}
                >
                    <List className="w-4 h-4" />
                    <span>
                        {remaining > 0
                            ? `View all ${data.count} lists`
                            : `View ${data.count} ${data.count === 1 ? "list" : "lists"}`}
                    </span>
                    <ChevronRight className="w-4 h-4 ml-auto" />
                </button>
            )}
        </div>
    );
};
