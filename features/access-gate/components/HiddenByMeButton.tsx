"use client";

/**
 * HiddenByMeButton — the one-click "Hidden by me" place for ANY list
 * (2026-10-14, the archived-items law's sibling). The list shell renders it in
 * its toolbar with the list's entity token; it is absent until the person has
 * hidden something of that kind. It opens a panel naming each hidden record
 * (each one opens — no dead ends) with "Show again".
 *
 * Lists whose own query narrows hidden rows server-side (Marketing › Brands)
 * use `HiddenFilter` + `applyHiddenView` instead.
 */

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EntityRef } from "@/components/official/entity-ref/EntityRef";
import { toast } from "@/lib/toast";
import {
  useHiddenByMe,
  useHiddenItems,
  useHideForMe,
} from "@/features/access-gate/hooks/useHiddenByMe";

export function HiddenByMeButton({
  token,
  pluralLabel,
}: {
  /** Platform entity token of the list (`note`, `transcript`, …). */
  token: string;
  /** "notes" — the list's own word for its records. */
  pluralLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ids = useHiddenByMe(token);
  const items = useHiddenItems(token, open);
  const { unhide } = useHideForMe(token);
  const count = ids.data?.length ?? 0;
  if (count === 0 && !open) return null;

  const showAgain = async (id: string, name: string) => {
    try {
      await unhide.mutateAsync(id);
      toast.success(`${name} is back in your list`);
      if (count <= 1) setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We couldn't show that again.");
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="quiet"
        icon={<EyeOff />}
        title={`${pluralLabel} you hid`}
        onClick={() => setOpen(true)}
      >
        {`Hidden ${count}`}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="matrx-touch-targets sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Hidden by me</DialogTitle>
            <DialogDescription>
              Only you stopped seeing these {pluralLabel}.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-[60dvh] flex-col divide-y divide-border overflow-y-auto">
            {(items.data ?? []).map((item) => {
              const name = item.label ?? "Untitled";
              return (
                <li key={item.id} className="flex items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <EntityRef token={item.token} id={item.id} name={name} />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    icon={<Eye />}
                    disabled={unhide.isPending}
                    onClick={() => void showAgain(item.id, name)}
                  >
                    Show again
                  </Button>
                </li>
              );
            })}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
