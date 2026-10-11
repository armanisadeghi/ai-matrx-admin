"use client";

/**
 * NotePickerPopover — lazy-loaded, searchable note picker with a collapsible
 * tree of homes (same browse pattern as NotesTreeView on /notes).
 *
 * Fetches lightweight list items (id + label + home, no content) only when
 * the popover opens. The parent receives a note id and should fetch full
 * content via NotesAPI.getById (or fetchNoteContent) on selection.
 *
 * Browse: homes collapsed by default with counts — expand one home at a time.
 * Search: flat results across all notes (label, home, id).
 */

import { noteDisplayLabel } from "@/features/notes/format";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ChevronRight, FileText, House, Loader2, Search } from "lucide-react";
import { idMatchesQuery } from "@ai-matrx/kit/search-scoring";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { cn } from "@/lib/utils";
import { Input } from "@ai-matrx/design-system/controls";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ai-matrx/design-system";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { NotesAPI } from "@/features/notes/service/notesApi";
import { useNoteHomes } from "@/features/notes/homes/useNoteHomes";
import type { NoteListItem } from "@/features/notes/types";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";

// ── Shared list cache (names only — invalidated after creates/deletes) ───────

let cachedItems: NoteListItem[] | null = null;
let cachePromise: Promise<NoteListItem[]> | null = null;

export function invalidateNotePickerCache(): void {
  cachedItems = null;
  cachePromise = null;
}

async function loadNoteListItems(): Promise<NoteListItem[]> {
  if (cachedItems) return cachedItems;
  if (!cachePromise) {
    cachePromise = NotesAPI.listItems()
      .then((items) => {
        cachedItems = items;
        return items;
      })
      .catch((err) => {
        cachePromise = null;
        throw err;
      });
  }
  return cachePromise;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface NotePickerAction {
  id: string;
  label: string;
  onSelect: () => void | Promise<void>;
}

export interface NotePickerPopoverProps {
  trigger: React.ReactNode;
  onSelectNote: (noteId: string) => void | Promise<void>;
  extraActions?: NotePickerAction[];
  align?: "start" | "center" | "end";
  side?: "top" | "right" | "bottom" | "left";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

// ── Picker body (shared between Popover + Drawer) ────────────────────────────

interface NotePickerBodyProps {
  items: NoteListItem[];
  isLoading: boolean;
  error: string | null;
  extraActions?: NotePickerAction[];
  onSelectNote: (noteId: string) => void | Promise<void>;
  onClose: () => void;
}

function NotePickerBody({
  items,
  isLoading,
  error,
  extraActions,
  onSelectNote,
  onClose,
}: NotePickerBodyProps) {
  const [search, setSearch] = useState("");
  const [expandedHome, setExpandedHome] = useState<string | null>(null);
  const noteHomes = useNoteHomes();
  const homeLabel = useCallback(
    (note: Pick<NoteListItem, "home_scope_id">) => noteHomes.labelOf(note.home_scope_id) ?? "Home",
    [noteHomes],
  );
  const homeIcon = (scopeId: string) => (noteHomes.byId.get(scopeId)?.isGeneral ? House : Box);

  const scopedItems = items;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return scopedItems.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        homeLabel(n).toLowerCase().includes(q) ||
        idMatchesQuery(n, q),
    );
  }, [scopedItems, search, homeLabel]);

  const notesByHome = useMemo(() => {
    const grouped: Record<string, NoteListItem[]> = {};
    for (const note of scopedItems) {
      const home = note.home_scope_id;
      (grouped[home] ??= []).push(note);
    }
    for (const home of Object.keys(grouped)) {
      grouped[home].sort((a, b) =>
        (b.updated_at ?? "").localeCompare(a.updated_at ?? ""),
      );
    }
    return grouped;
  }, [scopedItems]);

  const treeHomes = useMemo(() => {
    return Object.keys(notesByHome);
  }, [scopedItems, notesByHome]);

  const filteredHomesForSearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return treeHomes.filter(
      (home) =>
        (notesByHome[home]?.[0] ? homeLabel(notesByHome[home][0]) : "").toLowerCase().includes(q) ||
        (notesByHome[home] ?? []).some(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            idMatchesQuery(n, q),
        ),
    );
  }, [treeHomes, notesByHome, search, homeLabel]);

  const isSearching = search.trim().length > 0;

  const handlePick = useCallback(
    async (noteId: string) => {
      await onSelectNote(noteId);
      onClose();
      setSearch("");
      setExpandedHome(null);
    },
    [onSelectNote, onClose],
  );

  const handleAction = useCallback(
    async (action: NotePickerAction) => {
      await action.onSelect();
      onClose();
      setSearch("");
    },
    [onClose],
  );

  const handleToggleHome = useCallback((home: string) => {
    setExpandedHome((prev) => (prev === home ? null : home));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading notes…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-6 text-center text-xs text-destructive">
        {error}
        <ErrorAlchemyMenu error={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col text-xs">
      <div className="border-b border-border px-2 py-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input adornment="start"
            type="search"
            placeholder="Search notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
        {isSearching ? (
          <div className="py-0.5">
            {filteredHomesForSearch.length === 0 &&
            filteredItems.length === 0 ? (
              <div className="px-3 py-6 text-center text-muted-foreground">
                No results found
              </div>
            ) : (
              <>
                {filteredHomesForSearch.length > 0 && (
                  <div className="pb-0.5">
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                      Homes
                    </div>
                    {filteredHomesForSearch.map((home) => {
                      const homeNotes = notesByHome[home] ?? [];
                      const homeNameLabel = homeNotes[0] ? homeLabel(homeNotes[0]) : "Home";
                      const HomeIcon = homeIcon(home);

                      return (
                        <button
                          key={home}
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setExpandedHome(home);
                          }}
                          className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
                        >
                          <HomeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate font-medium">
                            {homeNameLabel}
                          </span>
                          <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/50">
                            {homeNotes.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {filteredItems.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                      Notes
                    </div>
                    {filteredItems.map((note) => (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => {
                          void handlePick(note.id);
                        }}
                        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-accent/50 transition-colors"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0 opacity-50" />
                        <span className="min-w-0 flex-1 truncate">
                          {noteDisplayLabel(note)}
                        </span>
                        <span className="shrink-0 truncate text-[0.5625rem] text-muted-foreground/50 max-w-[72px]">
                          {homeLabel(note)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="select-none py-0.5">
            {treeHomes.length === 0 ? (
              <div className="px-3 py-6 text-center text-muted-foreground">
                No notes yet
              </div>
            ) : (
              treeHomes.map((home) => {
                const isExpanded = expandedHome === home;
                const homeNotes = notesByHome[home] ?? [];
                const homeNameLabel = homeNotes[0] ? homeLabel(homeNotes[0]) : "Home";
                const HomeIcon = homeIcon(home);

                return (
                  <div key={home}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-1 px-2 py-1 hover:bg-accent/50 transition-colors",
                        isExpanded && "bg-accent/30",
                      )}
                      onClick={() => handleToggleHome(home)}
                    >
                      <ChevronRight
                        className={cn(
                          "h-3 w-3 shrink-0 transition-transform duration-150",
                          isExpanded && "rotate-90",
                        )}
                      />
                      <HomeIcon className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{homeNameLabel}</span>
                      <span className="ml-auto pr-0.5 text-[9px] tabular-nums text-muted-foreground/50">
                        {homeNotes.length}
                      </span>
                    </button>

                    {isExpanded && (
                      <div>
                        {homeNotes.map((note) => (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => {
                              void handlePick(note.id);
                            }}
                            className="flex w-full items-center gap-1 py-1 pl-6 pr-2 text-left hover:bg-accent/40 transition-colors"
                          >
                            <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                            <span className="truncate">
                              {noteDisplayLabel(note)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {extraActions && extraActions.length > 0 && (
          <div className="border-t border-border py-0.5">
            {extraActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => {
                  void handleAction(action);
                }}
                className="flex w-full items-center px-2.5 py-1.5 text-left text-primary hover:bg-accent/50 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public component ─────────────────────────────────────────────────────────

// ── Inline form (a host that already owns the frame: a dialog, a menu page) ──

export interface NotePickerInlineProps {
  /** The picked note, with its list row (label, home) when known. */
  onSelectNote: (noteId: string, note: NoteListItem | null) => void | Promise<void>;
}

/**
 * The same picker body, rendered in place — for hosts that are already a
 * dialog or panel and must not stack a popover on top (the board's Add menu).
 */
export function NotePickerInline({ onSelectNote }: NotePickerInlineProps) {
  const [state, setState] = useState<{
    items: NoteListItem[];
    isLoading: boolean;
    error: string | null;
  }>({ items: [], isLoading: true, error: null });

  useEffect(() => {
    let live = true;
    loadNoteListItems().then(
      (items) => {
        if (live) setState({ items, isLoading: false, error: null });
      },
      (err: unknown) => {
        if (live) {
          setState({
            items: [],
            isLoading: false,
            error: `Could not load notes: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      },
    );
    return () => {
      live = false;
    };
  }, []);

  return (
    <NotePickerBody
      items={state.items}
      isLoading={state.isLoading}
      error={state.error}
      onSelectNote={(noteId) =>
        onSelectNote(noteId, state.items.find((n) => n.id === noteId) ?? null)
      }
      onClose={() => {}}
    />
  );
}

export function NotePickerPopover({
  trigger,
  onSelectNote,
  extraActions,
  align = "start",
  side = "bottom",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  className,
}: NotePickerPopoverProps) {
  const isMobile = useIsMobile();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [items, setItems] = useState<NoteListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        setIsLoading(true);
        setError(null);
        void loadNoteListItems()
          .then((loaded) => {
            setItems(loaded);
          })
          .catch(() => {
            setError("Could not load notes");
            setItems([]);
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    },
    [setOpen],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const body = (
    <NotePickerBody
      items={items}
      isLoading={isLoading}
      error={error}
      extraActions={extraActions}
      onSelectNote={onSelectNote}
      onClose={handleClose}
    />
  );

  const mergedTrigger = React.isValidElement(trigger)
    ? React.cloneElement(
        trigger as React.ReactElement<{
          onClick?: (event: React.MouseEvent) => void;
          className?: string;
        }>,
        {
          className: cn(
            (trigger as React.ReactElement<{ className?: string }>).props
              .className,
            className,
          ),
        },
      )
    : trigger;

  if (isMobile) {
    const mobileTrigger = React.isValidElement(mergedTrigger)
      ? React.cloneElement(
          mergedTrigger as React.ReactElement<{
            onClick?: (event: React.MouseEvent) => void;
          }>,
          {
            onClick: (event: React.MouseEvent) => {
              (
                mergedTrigger as React.ReactElement<{
                  onClick?: (event: React.MouseEvent) => void;
                }>
              ).props.onClick?.(event);
              if (!event.defaultPrevented) {
                handleOpenChange(true);
              }
            },
          },
        )
      : mergedTrigger;

    return (
      <>
        {mobileTrigger}
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="pb-safe">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-sm">Choose a note</DrawerTitle>
            </DrawerHeader>
            <div className="px-2 pb-4">{body}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{mergedTrigger}</PopoverTrigger>
      <PopoverContent sizing="content" className="p-0" align={align} side={side}>
        {body}
      </PopoverContent>
    </Popover>
  );
}
