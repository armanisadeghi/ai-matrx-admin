"use client";

/**
 * Held Cloud folder deletes, in front of the person (aidream review 2 N2): the
 * machine never sends a mass or unsafe delete to the cloud on its own, so the
 * person chooses here — delete those files in the cloud, or put them back in the
 * folder. Unanswered, the machine restores them at `restoresAt`. Also says when
 * the sync skipped entries (symlinks, refused files), so nothing fails silently.
 * Renders nothing when there is nothing to say.
 */

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast, toastErrorAlreadyCaptured } from "@/lib/toast";
import { getCloudFolderState, resolveHeldDeletes, type CloudFolderState } from "./service";

const POLL_MS = 30_000;

function day(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CloudFolderNotice() {
  const [state, setState] = useState<CloudFolderState | null>(null);
  const [busy, setBusy] = useState<"delete" | "restore" | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await getCloudFolderState());
    } catch {
      // A machine that does not answer this read shows no notice; the screen
      // above already says when the machine itself is unreachable.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const answer = async (action: "delete" | "restore") => {
    const hold = state?.hold;
    if (!hold) return;
    setBusy(action);
    try {
      await resolveHeldDeletes(hold.holdId, action);
      toast.success(action === "delete" ? `Deleted ${hold.held} in cloud` : `Restored ${hold.held} files`);
    } catch (error) {
      toastErrorAlreadyCaptured(error instanceof Error ? error.message : "Could not apply your choice.");
    } finally {
      setBusy(null);
      void load();
    }
  };

  if (!state) return null;
  const { hold, skipped } = state;
  if (!hold && skipped.count === 0) return null;
  const restores = day(hold?.restoresAt ?? null);
  return (
    <div className="flex flex-col gap-1.5">
      {hold ? (
        <div role="alert" className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-2 text-sm">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
            <span title={hold.sample.join("\n")}>{hold.held} deleted files are still in your cloud</span>
          </div>
          {restores ? <p className="text-xs text-muted-foreground">Restores on {restores}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="danger"
              icon={<Trash2 />}
              disabled={busy !== null}
              onClick={() => void answer("delete")}
            >
              Delete {hold.held} in cloud
            </Button>
            <Button
              variant="outline"
              icon={<RotateCcw />}
              disabled={busy !== null}
              onClick={() => void answer("restore")}
            >
              Restore to folder
            </Button>
          </div>
        </div>
      ) : null}
      {skipped.count > 0 ? (
        <p
          className="text-xs text-muted-foreground"
          title={skipped.items.map((i) => `${i.path}: ${i.reason}`).join("\n")}
        >
          {skipped.count} Cloud items not synced
        </p>
      ) : null}
    </div>
  );
}
