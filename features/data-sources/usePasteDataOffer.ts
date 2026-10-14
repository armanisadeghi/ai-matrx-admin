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

/** The Data library prefilled for a source: it opens that source with the pasted link in place (pure). */
export function getDataHref(opts: { sourceKey?: string; field?: string; value?: string } = {}): string {
  const q = new URLSearchParams();
  if (opts.sourceKey) q.set("source", opts.sourceKey);
  if (opts.field) q.set("field", opts.field);
  if (opts.value) q.set("value", opts.value);
  const s = q.toString();
  return s ? `/data/library?${s}` : "/data/library";
}

/**
 * The one paste handler: a pasted address that a data source covers → a toast OFFER "Get as data
 * table" (opens the Data library on that source, link filled in). Never fetches on paste; the paste itself lands as usual.
 */
function usePasteOfferHandler(disabled: boolean) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // org-filter: write-target the offered fetch makes a new table in the organization she works in
  const { organizationId } = useOrganizationRequired();

  return useEffectEvent((event: ClipboardEvent) => {
    if (disabled || !organizationId) return;
    const text = event.clipboardData?.getData("text/plain") ?? "";
    if (!text.trim() || text.trim().includes("\n") || !asWebAddress(text)) return;
    // org-filter: server-call the source catalog request runs in the selected organization
    void queryClient
      .fetchQuery({
        queryKey: dataSourcesKey(organizationId), // org-filter: server-call cache partition for the selected organization request
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
}

/** Paste offer on one textarea (the legacy chat input's clipboard slot). */
export function usePasteDataOffer(textareaRef: RefObject<HTMLTextAreaElement | null>, disabled = false) {
  const onPaste = usePasteOfferHandler(disabled);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return undefined;
    el.addEventListener("paste", onPaste);
    return () => el.removeEventListener("paste", onPaste);
  }, [textareaRef]);
}

/** The main composer marks itself with this attribute (SmartAgentInput); its box is a textarea or a text editor inside it. */
export const COMPOSER_SELECTOR = "[data-composer-size]";

/** True when a paste landed in a chat composer's text box (pure; the matcher wiring is tested on it). */
export function isComposerPasteTarget(target: EventTarget | null): boolean {
  const el = target instanceof Element ? target : null;
  return !!el && !!el.closest(COMPOSER_SELECTOR) && !!el.closest("textarea, [contenteditable='true'], [contenteditable='']");
}

/** The main /chat composer (SmartAgentInput lives in the chat package, with no paste slot): one document listener scoped to composers. */
export function useComposerPasteDataOffer() {
  const handler = usePasteOfferHandler(false);
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (isComposerPasteTarget(event.target)) handler(event);
    };
    document.addEventListener("paste", onPaste, true);
    return () => document.removeEventListener("paste", onPaste, true);
  }, []);
}

/** The chat composer's paste slot: pasted images as before, plus the data-table offer for an address. */
export function useClipboardPasteWithDataOffer(props: Parameters<typeof useClipboardPaste>[0]) {
  useClipboardPaste(props);
  usePasteDataOffer(props.textareaRef, props.disabled);
  return null;
}
