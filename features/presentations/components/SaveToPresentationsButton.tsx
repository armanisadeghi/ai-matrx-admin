"use client";

/**
 * "Save to Presentations" on any deck an agent or chat produced (the presentation_deck renderer):
 * the deck becomes an editable presentation of the person's own (kind JSON kept as-is), then the
 * button turns into the door to it.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FolderInput, Loader2 } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { toast } from "@/lib/toast";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { isServiceFailure } from "@/features/data-tables/types";
import { createPresentation } from "../presentation-service";

export function SaveToPresentationsButton({ deck, title }: { deck: unknown; title?: string }) {
  const router = useRouter();
  const userId = useAppSelector(selectUserId);
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  if (!userId) return null;

  if (savedId) {
    return (
      <Button
        variant="outline"
        icon={<ExternalLink />}
        aria-label="Open in Presentations"
        title="Open in Presentations"
        onClick={() => router.push(`/presentations/${savedId}`)}
      />
    );
  }

  const save = async () => {
    setBusy(true);
    try {
      const organizationId = await ensureOrgId(null);
      const res = await createPresentation({ organizationId, deck, source: "chat", ...(title ? { name: title } : {}) });
      if (isServiceFailure(res)) throw new Error(res.error);
      setSavedId(res.data.id);
      toast.success("Saved to Presentations", {
        action: { label: "Open", onClick: () => router.push(`/presentations/${res.data.id}`) },
      });
    } catch (err) {
      toast.error("Could not save the deck", { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      icon={busy ? <Loader2 className="animate-spin" /> : <FolderInput />}
      aria-label="Save to Presentations"
      title="Save to Presentations"
      disabled={busy}
      onClick={() => void save()}
    />
  );
}
