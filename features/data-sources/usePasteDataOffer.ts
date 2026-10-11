"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { toast } from "@/lib/toast";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";
import { useClipboardPaste } from "@/components/ui/file-upload/useClipboardPaste";

import { dataSourcesKey } from "./hooks";
import { asWebAddress, dataTableOffer } from "./offer";
import { getDataSources } from "./server";

/** The address of the Get data page prefilled for a source (pure). */
export function getDataHref(opts: { sourceKey?: string; field?: string; value?: string } = {}): string {
  const q = new URLSearchParams();
  if (opts.sourceKey) q.set("source", opts.sourceKey);
  if (opts.field) q.set("field", opts.field);
  if (opts.value) q.set("value", opts.value);
  const s = q.toString();
  return s ? `/data/get?${s}` : "/data/get";
}

/**
 * A pasted address that a data source covers → a toast OFFER "Get as data table" (opens the Get
 * data page prefilled). Never fetches on paste; the paste itself lands in the box as usual.
 */
export function usePasteDataOffer(textareaRef: RefObject<HTMLTextAreaElement | null>, disabled = false) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // org-filter: write-target the offered fetch makes a new table in the organization she works in
  const { organizationId } = useOrganizationRequired();

  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    if (disabled || !organizationId) return;
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (!text.trim() || text.trim().includes("\n") || !asWebAddress(text)) return;
    void queryClient
      .fetchQuery({
        queryKey: dataSourcesKey(organizationId),
        queryFn: ({ signal }) => getDataSources({ organizationId, signal }),
        staleTime: 5 * 60 * 1000,
      })
      .then((catalog) => {
        const offer = dataTableOffer(text, catalog.sources);
        if (!offer) return;
        const field = offer.source.input.fields[0]?.name ?? "url";
        toast(offer.source.label, {
          action: {
            label: "Get as data table",
            onClick: () => router.push(getDataHref({ sourceKey: offer.source.key, field, value: offer.url })),
          },
        });
      })
      .catch((err: unknown) => {
        // The offer is a convenience; the paste already landed. Say why it is absent.
        console.warn("[data-sources] paste offer unavailable:", err instanceof Error ? err.message : err);
      });
  });

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return undefined;
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [textareaRef]);
}

/** The chat composer's paste slot: pasted images as before, plus the data-table offer for an address. */
export function useClipboardPasteWithDataOffer(props: Parameters<typeof useClipboardPaste>[0]) {
  useClipboardPaste(props);
  usePasteDataOffer(props.textareaRef, props.disabled);
  return null;
}
