"use client";

// "…" holds EVERY action of the page — so it has to scale from 3 to 30 verbs. Modeled on Linear's
// command menu: the search field has focus on open, the verbs are grouped, Enter runs the first
// match, arrows move, destructive verbs sit last behind a rule.
import { useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@ai-matrx/design-system";
import { SearchField } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system/cn";

export interface PageTopAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** The heading the verb sits under ("This page", "Brand", "View"). */
  group: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Words the search also matches ("new", "create" for Add brand). */
  keywords?: readonly string[];
}

const ROW = "[data-page-action]";

function matches(a: PageTopAction, q: string): boolean {
  const hay = [a.label, a.group, ...(a.keywords ?? [])].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

export function PageTopActionsMenu({ actions, title, trigger }: { actions: readonly PageTopAction[]; title: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = actions.filter((a) => matches(a, query));
  const plain = shown.filter((a) => !a.destructive);
  const danger = shown.filter((a) => a.destructive);
  const groups = [...new Set(plain.map((a) => a.group))];

  function run(a: PageTopAction) {
    if (a.disabled) return;
    setOpen(false);
    setQuery("");
    a.onSelect();
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const first = shown.find((a) => !a.disabled);
      if (first) {
        e.preventDefault();
        run(first);
      }
    } else if (e.key === "ArrowDown") {
      const el = listRef.current?.querySelector<HTMLElement>(ROW);
      if (el) {
        e.preventDefault();
        el.focus();
      }
    }
  }

  function onListKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const all = [...(listRef.current?.querySelectorAll<HTMLElement>(ROW) ?? [])];
    const at = all.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? all[at + 1] : at <= 0 ? searchRef.current : all[at - 1];
    if (next) {
      e.preventDefault();
      next.focus();
    }
  }

  const row = (a: PageTopAction) => {
    const Icon = a.icon;
    return (
      <button
        key={a.id}
        type="button"
        data-page-action=""
        disabled={a.disabled}
        onClick={() => run(a)}
        className={cn(
          "type-body flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:bg-accent disabled:text-disabled-foreground",
          a.destructive ? "text-destructive" : "text-foreground",
        )}
      >
        {Icon ? <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" /> : <span className="size-4 shrink-0" />}
        <span className="min-w-0 flex-1 truncate">{a.label}</span>
      </button>
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="end"
        width="md"
        padding="none"
        surface="solid"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          searchRef.current?.focus();
        }}
        onEscapeKeyDown={(e) => {
          if (!query) return;
          e.preventDefault();
          setQuery("");
        }}
      >
        <div className="px-2 pt-2">
          <SearchField
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={`Actions for ${title}`}
            aria-label={`Search actions for ${title}`}
          />
        </div>
        <div ref={listRef} onKeyDown={onListKey} className="max-h-[60dvh] overflow-y-auto overscroll-contain p-1">
          {groups.map((g) => (
            <div key={g} role="group" aria-label={g}>
              <p className="type-meta px-2 pb-1 pt-2 text-muted-foreground">{g}</p>
              {plain.filter((a) => a.group === g).map(row)}
            </div>
          ))}
          {danger.length > 0 ? (
            <div role="group" aria-label="Destructive" className={cn(plain.length > 0 && "mt-1 border-t border-border pt-1")}>
              {danger.map(row)}
            </div>
          ) : null}
          {shown.length === 0 ? <p className="type-meta px-2 py-2 text-muted-foreground">No action matches</p> : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
