/**
 * What the offline notices of the co-editing session say, in plain words (C10). Shared by the Docs and Sheets
 * editors: the room hands over `offline_restored` (edits found on this device at open) and `offline_refused`
 * (edits the room cannot take: it changed protocol, or the record is gone). A refused buffer stays on the device
 * until the person copies it or dismisses the notice's own discard.
 */
import { copyText } from "@ai-matrx/kit/clipboard";
import { toast } from "@/components/ui/use-toast";

interface RestoredNotice {
  kind: "offline_restored";
  changes: number;
  rebased: boolean;
  lost: unknown[];
}
interface RefusedNotice {
  kind: "offline_refused";
  reason: string;
  groups: unknown[][];
  discard: () => Promise<void>;
}

const GONE = new Set(["trashed", "no_room", "no_access", "refused"]);

/** True when the notice was an offline one and has been shown. */
export function showOfflineNotice(n: { kind: string }, noun: "document" | "workbook"): boolean {
  if (n.kind === "offline_restored") {
    const r = n as unknown as RestoredNotice;
    if (r.rebased && r.lost.length === 0) return true; // the chrome's "Syncing…" says it
    toast({
      title: "Some offline changes may have moved",
      description:
        r.lost.length > 0
          ? `This ${noun} changed a lot while you were away. ${r.lost.length} of your changes could not be added.`
          : `This ${noun} changed a lot while you were away. Check where your changes landed.`,
      variant: "destructive",
      duration: 15000,
    });
    return true;
  }
  if (n.kind === "offline_refused") {
    const r = n as unknown as RefusedNotice;
    const gone = GONE.has(r.reason);
    toast({
      title: gone ? `This ${noun} is no longer available` : `Your offline changes can't be added`,
      description: gone
        ? "What you typed offline is still saved on this device."
        : `This ${noun} was updated while you were away, so your offline changes can't be added to it. They are still saved on this device.`,
      variant: "destructive",
      duration: 60000,
      action: {
        label: "Copy my offline text",
        onClick: () => {
          void (async () => {
            const { offlineTextOfGroups } = await import("@ai-matrx/office/univer/collab");
            const text = offlineTextOfGroups(r.groups as never);
            if (!text) {
              toast({ title: "Nothing to copy", description: "Your offline changes are still saved on this device.", variant: "destructive" });
              return;
            }
            const ok = await copyText(text);
            if (ok) {
              await r.discard();
              toast({ title: "Copied your offline text" });
            } else {
              toast({ title: "Could not copy", description: "Your offline text is still saved on this device.", variant: "destructive" });
            }
          })();
        },
      },
    });
    return true;
  }
  return false;
}
