"use client";

/**
 * features/pdf/hooks/useCloudPdfBytes.ts — the resolved bytes of one cloud PDF for hosts that are not the viewer:
 * the PDF workspace's thumbnail queue, download and print. It is the only door beside `PdfPreview` that turns a
 * cld file id into bytes (the one-pdf-viewer contract: every other host composes this hook or PdfPreview), so a
 * file is never resolved by a host's own `usePdfRemoteSource` call.
 */
import { useCallback } from "react";
import { usePdfRemoteSource } from "./usePdfRemoteSource";

export function useCloudPdfBytes(fileId: string) {
  const { remoteUrl, headers, withCredentials } = usePdfRemoteSource(fileId);
  const fetchBytes = useCallback(async (): Promise<Blob> => {
    if (!remoteUrl) throw new Error("The file is still loading. Try again in a moment.");
    const res = await fetch(remoteUrl, { headers, credentials: withCredentials ? "include" : "same-origin" });
    if (!res.ok) throw new Error(res.status === 404 ? "That file could not be found. It may have been moved or deleted." : "The file could not be read. Try again in a moment.");
    return res.blob();
  }, [remoteUrl, headers, withCredentials]);
  return { remoteUrl, headers, withCredentials, fetchBytes };
}
