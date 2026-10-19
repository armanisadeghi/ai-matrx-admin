"use client";

/**
 * What the owner knows — the way a person acts on discovery. Saves to the
 * site's business guidelines document (one write path, `setKwGuidelines`), and
 * every discovery rung reads it as owner-provided fact above the site's pages.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@ai-matrx/design-system/controls";
import { ProTextarea } from "@/components/official/ProTextarea";
import { AboutPeek } from "@/features/marketing/components/shared/AboutPeek";
import {
  InlineQueryError,
  SectionCard,
} from "@/features/marketing/components/shared/MarketingUi";
import {
  getKwGuidelines,
  kwGuidelinesQueryKey,
  setKwGuidelines,
} from "@/features/marketing/search-console/data-kw-guidelines";
import { extractErrorMessage } from "@/utils/errors";
import { toast } from "@/lib/toast";

export const OWNER_FACTS_EDIT_TARGET = "discovery-owner-facts";

export function OwnerFacts({ siteId }: { siteId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const stored = useQuery({
    queryKey: kwGuidelinesQueryKey(siteId),
    queryFn: ({ signal }) => getKwGuidelines(siteId, signal),
  });
  const saved = stored.data?.guidelines ?? "";
  const value = draft ?? saved;
  const dirty = draft !== null && draft !== saved;

  const save = useMutation({
    mutationFn: (text: string) => setKwGuidelines(siteId, text),
    onSuccess: (row) => {
      setDraft(null);
      queryClient.setQueryData(kwGuidelinesQueryKey(siteId), row);
      toast.success("Saved — re-run a step to use it");
    },
    onError: (error) =>
      toast.error("Could not save", { description: extractErrorMessage(error) }),
  });

  return (
    <SectionCard
      title="What you know about this business"
      about="Facts only you have — what you sell, who pays, where you work, what is wrong below. Every step reads this above the website, and your keyword rulings read it too."
    >
      <div className="grid gap-2 p-3">
        {stored.isError ? (
          <InlineQueryError
            what="your notes"
            error={stored.error}
            onRetry={() => void stored.refetch()}
          />
        ) : null}
        <ProTextarea
          data-edit-target={OWNER_FACTS_EDIT_TARGET}
          value={value}
          onChange={(event) => setDraft(event.target.value)}
          disabled={stored.isLoading || save.isPending}
          spellCheck
          placeholder="e.g. We repair commercial HVAC in Orange County. Residential calls are not our customer."
          className="min-h-28 resize-y text-sm"
        />
        <div className="flex items-center justify-end gap-2">
          <AboutPeek
            title="Re-run to apply"
            about="Saving does not change results already shown. Re-run any step and it reads this."
          />
          <Button
            variant="primary"
            disabled={!dirty || save.isPending}
            onClick={() => save.mutate(value.trim())}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
