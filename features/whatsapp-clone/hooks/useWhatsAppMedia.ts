"use client";

import { useEffect, useState } from "react";
import { getMockMedia } from "../mock-data/media";
import { getMockLinks } from "../mock-data/links";
import { getMockDocs } from "../mock-data/docs";
import type { WADocItem, WALinkItem, WAMediaItem } from "../types";
import { useWhatsAppDataMode } from "./WhatsAppDataModeProvider";

export interface UseWhatsAppMediaReturn {
  media: WAMediaItem[];
  links: WALinkItem[];
  docs: WADocItem[];
  isLoading: boolean;
  error: string | null;
}

export function useWhatsAppMedia(): UseWhatsAppMediaReturn {
  const { mode } = useWhatsAppDataMode();
  const [media, setMedia] = useState<WAMediaItem[]>(() =>
    mode === "mock" ? getMockMedia() : [],
  );
  const [links, setLinks] = useState<WALinkItem[]>(() =>
    mode === "mock" ? getMockLinks() : [],
  );
  const [docs, setDocs] = useState<WADocItem[]>(() =>
    mode === "mock" ? getMockDocs() : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "mock") {
      setMedia(getMockMedia());
      setLinks(getMockLinks());
      setDocs(getMockDocs());
      setError(null);
      return;
    }
    // Live mode would partition cloudFiles slice here. Until features/files
    // exposes a stable selector contract for this gateway, fall back to mock
    // to avoid empty surfaces during the transition.
    setMedia(getMockMedia());
    setLinks(getMockLinks());
    setDocs(getMockDocs());
  }, [mode]);

  return { media, links, docs, isLoading, error };
}
