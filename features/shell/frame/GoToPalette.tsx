"use client";

// THE "GO TO" PALETTE — find any page or feature by name or by another word for it, and go
// straight there. Loaded on first open by GoToSearch (never on page load). Results are grouped by
// product, each group headed by the product's mark; ranking and highlighting are the shared
// engine's (searchEngine.ts, the same one the classic "Search menu" uses). Enter goes to the
// page; Cmd/Ctrl+Enter or a Cmd/Ctrl-click opens it in a new tab.
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { CornerDownLeft } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ai-matrx/design-system";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { ProductMark } from "./ProductMark";
import { buildGoToIndex, MENU_GO_TO_PRODUCT_ID } from "./goToIndex";
import type { GoToEntry } from "./goToIndex";
import { FRAME_ROUTE_HOMES } from "./route-homes.generated";
import { highlightMenuMatch, rankMenuSearch } from "./searchEngine";
import type { FrameProduct, ProductFamily } from "./types";

export interface GoToPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: readonly FrameProduct[];
  families: readonly { id: ProductFamily; label: string }[];
  /** Same-tab navigation (the host's router). Without it the palette assigns the location. */
  onGo?: (href: string) => void;
  /** More places the host knows (its own menus), merged into the index. */
  extraEntries?: readonly GoToEntry[];
}

function Highlighted({ text, query }: { text: string; query: string }): ReactNode {
  return highlightMenuMatch(text, query).map((run, i) =>
    run.match ? (
      <mark key={i} className="rounded-sm bg-transparent font-semibold text-foreground">
        {run.text}
      </mark>
    ) : (
      <span key={i}>{run.text}</span>
    ),
  );
}

/** Hits grouped by product, groups in order of their best hit. */
function groupByProduct(hits: readonly GoToEntry[]): { productId: string; entries: GoToEntry[] }[] {
  const groups: { productId: string; entries: GoToEntry[] }[] = [];
  for (const hit of hits) {
    let group = groups.find((g) => g.productId === hit.productId);
    if (!group) groups.push((group = { productId: hit.productId, entries: [] }));
    group.entries.push(hit);
  }
  return groups;
}

export default function GoToPalette({ open, onOpenChange, products, families, onGo, extraEntries }: GoToPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("");
  // Cmd/Ctrl held on Enter or click: open in a new tab.
  const newTab = useRef(false);

  const [index] = useState(() => buildGoToIndex(products, families, FRAME_ROUTE_HOMES, extraEntries));
  const productById = new Map(products.map((p) => [p.id, p]));
  const trimmed = query.trim();
  const hits = trimmed ? rankMenuSearch(index, trimmed) : [];
  // Idle: one row per product, so the palette doubles as a switcher.
  const idle = index.filter((e) => e.id.startsWith("product:"));

  const go = (entry: GoToEntry, inNewTab: boolean) => {
    onOpenChange(false);
    if (inNewTab) openOutbound(entry.href, "_blank", "noopener,noreferrer");
    else if (onGo) onGo(entry.href);
    else window.location.assign(entry.href);
  };

  const row = (entry: GoToEntry, group: string) => (
    <CommandItem
      key={`${group}:${entry.id}`}
      value={`${group}:${entry.id}`}
      onPointerDown={(e) => {
        newTab.current = e.metaKey || e.ctrlKey;
      }}
      onSelect={() => go(entry, newTab.current)}
      className="group gap-2.5 !py-2"
    >
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 truncate text-sm text-foreground">
          <Highlighted text={entry.label} query={trimmed} />
        </span>
        {entry.trail.length > 1 ? (
          <span className="min-w-0 truncate type-secondary text-muted-foreground">{entry.trail.slice(1).join(" › ")}</span>
        ) : null}
      </span>
      <CornerDownLeft
        aria-hidden
        className="!h-3.5 !w-3.5 shrink-0 text-muted-foreground opacity-0 group-data-[selected=true]:opacity-100"
      />
    </CommandItem>
  );

  const heading = (productId: string) => {
    const product = productById.get(productId);
    return product ? (
      <span className="flex items-center gap-1.5">
        <ProductMark product={product} size="inline" />
        {product.name}
      </span>
    ) : productId === MENU_GO_TO_PRODUCT_ID ? (
      "App menu"
    ) : (
      productId
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command
        shouldFilter={false}
        loop
        value={selected}
        onValueChange={setSelected}
        onKeyDown={(e) => {
          if (e.key === "Enter") newTab.current = e.metaKey || e.ctrlKey;
        }}
        className="bg-transparent"
        data-go-to-palette=""
      >
        <CommandInput
          autoFocus
          value={query}
          onValueChange={(next) => {
            setQuery(next);
            setSelected("");
          }}
          placeholder="Go to any page or feature…"
          aria-label="Go to any page or feature"
          className="pr-8"
        />
        <CommandList className="h-[min(60vh,28rem)] max-h-none">
          {trimmed ? (
            <>
              <CommandEmpty>Nothing matches “{trimmed}”.</CommandEmpty>
              {groupByProduct(hits).map((g) => (
                <CommandGroup key={g.productId} heading={heading(g.productId)}>
                  {g.entries.map((e) => row(e, "hit"))}
                </CommandGroup>
              ))}
            </>
          ) : (
            <CommandGroup heading="Products">{idle.map((e) => row(e, "product"))}</CommandGroup>
          )}
        </CommandList>
        <div className="flex items-center gap-3 border-t border-border px-3 py-1.5 type-secondary text-muted-foreground">
          <span><kbd className="font-sans">↑↓</kbd> Move</span>
          <span><kbd className="font-sans">↵</kbd> Open</span>
          <span><kbd className="font-sans">⌘↵</kbd> New tab</span>
          <span className="ml-auto"><kbd className="font-sans">Esc</kbd> Close</span>
        </div>
      </Command>
    </CommandDialog>
  );
}
