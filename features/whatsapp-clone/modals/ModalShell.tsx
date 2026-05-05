"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";
import { cn } from "@/styles/themes/utils";
import { ModalNavList } from "./ModalNavList";
import { ModalContentFrame } from "./ModalContentFrame";
import type { ModalNavItem, ModalShellFooter } from "../types";

interface ModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  searchPlaceholder?: string;
  headerSlot?: ReactNode;
  navItems: ModalNavItem[];
  initialNavId?: string;
  footer?: ModalShellFooter;
  className?: string;
}

interface StackEntry {
  id: string;
  parents: ModalNavItem[];
  current: ModalNavItem;
}

function findItem(
  items: ModalNavItem[],
  id: string,
  trail: ModalNavItem[] = [],
): { item: ModalNavItem; trail: ModalNavItem[] } | null {
  for (const item of items) {
    if (item.id === id) return { item, trail };
    if (item.children) {
      const found = findItem(item.children, id, [...trail, item]);
      if (found) return found;
    }
  }
  return null;
}

export function ModalShell({
  open,
  onOpenChange,
  title,
  searchPlaceholder = "Search",
  headerSlot,
  navItems,
  initialNavId,
  footer,
  className,
}: ModalShellProps) {
  const [stack, setStack] = useState<StackEntry[]>(() => {
    const id = initialNavId ?? navItems[0]?.id;
    if (!id) return [];
    const found = findItem(navItems, id);
    return found
      ? [{ id, parents: found.trail, current: found.item }]
      : [];
  });
  const [search, setSearch] = useState("");

  const top = stack[stack.length - 1];

  const filteredItems = useMemo(() => {
    if (!search.trim()) return navItems;
    const q = search.toLowerCase();
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [navItems, search]);

  const navContext = useMemo(
    () => ({
      push: (id: string) => {
        const found = findItem(navItems, id);
        if (!found) return;
        setStack((prev) => [
          ...prev,
          { id, parents: found.trail, current: found.item },
        ]);
      },
      pop: () => setStack((prev) => prev.slice(0, -1)),
      current: top?.id ?? "",
    }),
    [navItems, top?.id],
  );

  const handleSelect = (item: ModalNavItem) => {
    if (item.onSelect) item.onSelect();
    if (item.children && item.children.length > 0) {
      const found = findItem(navItems, item.id);
      if (!found) return;
      setStack([{ id: item.id, parents: found.trail, current: item }]);
      return;
    }
    if (item.panel) {
      const found = findItem(navItems, item.id);
      if (!found) return;
      setStack([{ id: item.id, parents: found.trail, current: item }]);
    }
  };

  const handlePushChild = (item: ModalNavItem) => {
    if (item.onSelect) item.onSelect();
    setStack((prev) => [
      ...prev,
      { id: item.id, parents: [...(top?.parents ?? []), top?.current ?? item], current: item },
    ]);
  };

  const showBack = stack.length > 1;
  const goBack = () => setStack((prev) => prev.slice(0, -1));

  const panelNode =
    top?.current.panel
      ? typeof top.current.panel === "function"
        ? top.current.panel(navContext)
        : top.current.panel
      : top?.current.children
      ? (
          <ModalNavList
            items={top.current.children}
            activeId={null}
            onSelect={handlePushChild}
            spacing="list"
            showChevrons
          />
        )
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-none gap-0 border-[#2a3942] bg-transparent p-0",
          "h-[640px] w-[920px] overflow-hidden rounded-xl shadow-2xl",
          className,
        )}
        style={{
          backdropFilter: "none",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <VisuallyHidden.Root>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden.Root>

        <div className="flex h-full">
          {/* Left nav */}
          <aside className="flex w-[300px] shrink-0 flex-col border-r border-[#0b141a] bg-[#111b21]">
            <div className="px-5 pb-3 pt-5">
              <h1 className="text-[20px] font-semibold text-[#e9edef]">
                {title}
              </h1>
            </div>
            <div className="px-3 pb-3">
              <div className="relative flex h-9 items-center rounded-lg bg-[#202c33]">
                <Search
                  className="ml-3.5 h-4 w-4 text-[#8696a0]"
                  aria-hidden
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label="Search"
                  className="flex-1 bg-transparent px-3 text-[14px] text-[#e9edef] placeholder:text-[#8696a0] focus:outline-none"
                />
              </div>
            </div>
            {headerSlot ? <div className="px-3 pb-2">{headerSlot}</div> : null}
            <ScrollArea className="flex-1">
              <div className="px-2 pb-3">
                <ModalNavList
                  items={filteredItems}
                  activeId={top?.parents[0]?.id ?? top?.id ?? null}
                  onSelect={handleSelect}
                  spacing="default"
                />
              </div>
            </ScrollArea>
          </aside>

          {/* Right content */}
          <section className="relative flex min-w-0 flex-1 flex-col">
            {top ? (
              <ModalContentFrame
                title={top.current.label}
                showBack={showBack}
                onBack={goBack}
              >
                {panelNode}
              </ModalContentFrame>
            ) : null}
            {footer ? (
              <div className="flex h-14 shrink-0 items-center justify-end border-t border-[#0b141a] bg-[#111b21] px-4">
                <button
                  type="button"
                  onClick={() => {
                    footer.onPrimary?.();
                    onOpenChange(false);
                  }}
                  className="rounded-md bg-[#2a3942] px-4 py-1.5 text-[13px] text-[#e9edef] hover:bg-[#374248]"
                >
                  {footer.primaryLabel}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
