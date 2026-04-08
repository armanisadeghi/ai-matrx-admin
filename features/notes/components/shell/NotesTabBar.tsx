"use client";

import { useAppSelector } from "@/lib/redux/hooks";
import { selectOpenTabNotes } from "../../redux/selectors";
import { useRouter, useParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { removeTab, setActiveNote } from "../../redux/slice";

/**
 * Browser-style tab bar — one tab per open note.
 * All interactive — Client Component.
 * TODO: Drag-to-reorder, dirty indicator (dot), right-click context menu.
 */
export function NotesTabBar() {
    const openNotes = useAppSelector(selectOpenTabNotes);
    const params = useParams();
    const activeId = typeof params?.id === "string" ? params.id : null;
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    if (openNotes.length === 0) {
        return (
            <div className="h-9 shrink-0 flex items-center border-b border-border bg-muted/20 px-2">
                <span className="text-xs text-muted-foreground">No open notes</span>
            </div>
        );
    }

    return (
        <div className="h-9 shrink-0 flex items-end gap-px border-b border-border bg-muted/20 overflow-x-auto overflow-y-hidden scrollbar-none px-1">
            {openNotes.map((note) => {
                const isActive = note.id === activeId;
                return (
                    <button
                        key={note.id}
                        onClick={() => {
                            if (!isActive && !isPending) {
                                dispatch(setActiveNote(note.id));
                                startTransition(() => {
                                    router.push(`/notes/${note.id}`);
                                });
                            }
                        }}
                        className={[
                            "group flex items-center gap-1.5 h-8 px-3 text-xs rounded-t border-t border-l border-r transition-colors min-w-0 max-w-[180px] shrink-0",
                            isActive
                                ? "bg-background border-border text-foreground"
                                : "bg-transparent border-transparent text-muted-foreground hover:bg-background/50 hover:text-foreground",
                            isPending ? "opacity-60" : "",
                        ].join(" ")}
                    >
                        {/* Dirty indicator */}
                        {note._dirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        )}
                        <span className="truncate">{note.label}</span>
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                dispatch(removeTab(note.id));
                                if (isActive) {
                                    const remaining = openNotes.filter((n) => n.id !== note.id);
                                    if (remaining.length > 0) {
                                        startTransition(() => {
                                            router.push(`/notes/${remaining[0].id}`);
                                        });
                                    } else {
                                        startTransition(() => {
                                            router.push("/notes");
                                        });
                                    }
                                }
                            }}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.click()}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-accent shrink-0"
                        >
                            <X className="w-3 h-3" />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
