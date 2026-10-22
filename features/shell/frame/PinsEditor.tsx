"use client";

// EDIT PINNED (Arman, 2026-10-22: "Add an edit icon to the right side of it so the user can click
// and easily edit what is there"). One dialog: the pins in order (move up, move down, remove), then
// the products not pinned yet (add). Opened in "add" mode from the dashed slot, the add list leads.
// Host-agnostic: the host saves the result through its one pins store.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Star, X } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@ai-matrx/design-system";
import { ProductMark } from "./ProductMark";
import { productPin } from "./products";
import type { FramePin, FrameProduct } from "./types";

export function PinsEditor({
  open,
  onOpenChange,
  mode,
  pins,
  products,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "add";
  pins: readonly FramePin[];
  products: readonly FrameProduct[];
  onSave: (next: FramePin[]) => void;
}) {
  const [draft, setDraft] = useState<FramePin[]>([...pins]);
  const [wasOpen, setWasOpen] = useState(open);
  // Each opening starts from the current pins.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft([...pins]);
  }

  const move = (index: number, by: -1 | 1) =>
    setDraft((d) => {
      const next = [...d];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item!);
      return next;
    });
  const pinnedProducts = new Set(draft.map((p) => p.productId).filter(Boolean));
  const addable = products.filter((p) => !pinnedProducts.has(p.id) && !draft.some((d) => d.href === p.homeHref));

  const current = (
    <section className="flex flex-col gap-1" data-mf-pins-current="">
      <span className="text-sm font-medium text-foreground">Pinned</span>
      {draft.map((pin, i) => {
        const product = pin.productId ? products.find((p) => p.id === pin.productId) : undefined;
        const Icon = pin.icon ?? Star;
        return (
          <div key={pin.id} className="flex h-8 items-center gap-2 px-1" data-mf-pins-row={pin.id}>
            {product ? <ProductMark product={product} size="inline" /> : <Icon aria-hidden className="size-4 text-muted-foreground" />}
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{product?.name ?? pin.label}</span>
            <Button variant="quiet" icon={<ArrowUp />} aria-label={`Move ${pin.label} up`} disabled={i === 0} onClick={() => move(i, -1)} />
            <Button
              variant="quiet"
              icon={<ArrowDown />}
              aria-label={`Move ${pin.label} down`}
              disabled={i === draft.length - 1}
              onClick={() => move(i, 1)}
            />
            <Button
              variant="quiet"
              icon={<X />}
              aria-label={`Remove ${pin.label}`}
              onClick={() => setDraft((d) => d.filter((x) => x.id !== pin.id))}
            />
          </div>
        );
      })}
    </section>
  );
  const add = (
    <section className="flex flex-col gap-1" data-mf-pins-add="">
      <span className="text-sm font-medium text-foreground">Add</span>
      <div className="max-h-56 overflow-y-auto">
        {addable.map((product) => (
          <div key={product.id} className="flex h-8 items-center gap-2 px-1">
            <ProductMark product={product} size="inline" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground">{product.name}</span>
            <Button
              variant="quiet"
              icon={<Plus />}
              aria-label={`Pin ${product.name}`}
              onClick={() => setDraft((d) => [...d, productPin(product)])}
            />
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit pinned</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {mode === "add" ? (
            <>
              {add}
              {current}
            </>
          ) : (
            <>
              {current}
              {add}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="quiet" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
