"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { ENDPOINTS } from "@/lib/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfDocument {
  id: string;
  name: string;
  content: string | null;
  cleanContent: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  charCount: number;
  wordCount: number;
}

export interface ExtractionTab {
  id: string;
  filename: string;
  status: "extracting" | "done" | "error" | "cleaning";
  error: string | null;
  document: PdfDocument | null;
  progressMessage?: string;
}

export type ActiveTabId = "new" | string;

export type BatchStatus = "idle" | "extracting";

interface NdjsonEvent {
  event: "info" | "data" | "end";
  data: Record<string, unknown>;
}

// ─── NDJSON streaming helper ──────────────────────────────────────────────────

async function* readNdjsonStream(
  response: Response,
): AsyncGenerator<NdjsonEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        yield JSON.parse(line) as NdjsonEvent;
      } catch {
        // skip malformed lines
      }
    }
  }

  // flush remaining buffer
  if (buffer.trim()) {
    try {
      yield JSON.parse(buffer) as NdjsonEvent;
    } catch {
      // skip
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function docFromApi(raw: Record<string, unknown>): PdfDocument {
  const content = (raw.content as string) ?? "";
  const cleanContent = (raw.clean_content as string) ?? null;
  return {
    id: raw.id as string,
    name: (raw.name as string) ?? "Untitled",
    content: content || null,
    cleanContent,
    source: (raw.source as string) ?? null,
    createdAt: (raw.created_at as string) ?? new Date().toISOString(),
    updatedAt: (raw.updated_at as string) ?? new Date().toISOString(),
    charCount: content.length,
    wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePdfExtractor() {
  const { getHeaders, waitForAuth } = useApiAuth();
  const backendUrl = useAppSelector(selectResolvedBaseUrl);

  // Tabs & navigation
  const [tabs, setTabs] = useState<ExtractionTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<ActiveTabId>("new");

  // History from backend
  const [history, setHistory] = useState<PdfDocument[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // "New extraction" tab state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track first completed tab id during batch extraction
  const firstCompletedTabRef = useRef<string | null>(null);

  // ── Auth headers helper ────────────────────────────────────────────────────

  const getAuthHeaders = useCallback(async () => {
    await waitForAuth();
    const headers = getHeaders() as Record<string, string>;
    const { "Content-Type": _, ...rest } = headers;
    return rest;
  }, [getHeaders, waitForAuth]);

  // ── Load history from backend ──────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      await waitForAuth();
      const headers = getHeaders() as Record<string, string>;
      const response = await fetch(
        `${backendUrl}${ENDPOINTS.pdf.documents}?limit=50`,
        { headers },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as Record<string, unknown>[];
      setHistory(data.map(docFromApi));
    } catch (err) {
      console.error("Failed to load PDF document history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [backendUrl, getHeaders, waitForAuth]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch a single document ────────────────────────────────────────────────

  const fetchDocument = useCallback(
    async (docId: string): Promise<PdfDocument | null> => {
      try {
        const headers = await getAuthHeaders();
        const allHeaders = {
          ...headers,
          "Content-Type": "application/json",
        };
        const response = await fetch(
          `${backendUrl}${ENDPOINTS.pdf.document(docId)}`,
          { headers: allHeaders },
        );
        if (!response.ok) return null;
        const data = (await response.json()) as Record<string, unknown>;
        return docFromApi(data);
      } catch {
        return null;
      }
    },
    [backendUrl, getAuthHeaders],
  );

  // ── File selection (for "New" tab) ─────────────────────────────────────────

  const addFiles = useCallback((files: File[]) => {
    const valid = files.filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/"),
    );
    if (valid.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...valid]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setSelectedFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // ── Batch extraction ───────────────────────────────────────────────────────

  const extractFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setBatchStatus("extracting");
    firstCompletedTabRef.current = null;

    // Create placeholder tabs for each file
    const placeholderTabs: ExtractionTab[] = selectedFiles.map((file, i) => ({
      id: `pending-${Date.now()}-${i}`,
      filename: file.name,
      status: "extracting" as const,
      error: null,
      document: null,
    }));

    setTabs((prev) => [...prev, ...placeholderTabs]);
    // Switch to first extracting tab
    setActiveTabId(placeholderTabs[0].id);

    try {
      const headers = await getAuthHeaders();
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch(
        `${backendUrl}${ENDPOINTS.pdf.batchExtract}?max_concurrent=3`,
        {
          method: "POST",
          headers,
          body: formData,
        },
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        // Mark all placeholder tabs as error
        setTabs((prev) =>
          prev.map((tab) =>
            placeholderTabs.some((p) => p.id === tab.id)
              ? {
                  ...tab,
                  status: "error" as const,
                  error: `HTTP ${response.status}: ${errText}`,
                }
              : tab,
          ),
        );
        setBatchStatus("idle");
        return;
      }

      // Track which placeholder index we're on (results arrive in completion order)
      let resultIndex = 0;

      for await (const event of readNdjsonStream(response)) {
        if (event.event === "info") {
          const code = event.data.code as string | undefined;
          if (code === "pdf_page_progress") {
            // Update progress on the currently extracting tab
            const msg = event.data.user_message as string;
            setTabs((prev) =>
              prev.map((tab) => {
                if (
                  placeholderTabs.some((p) => p.id === tab.id) &&
                  tab.status === "extracting"
                ) {
                  return { ...tab, progressMessage: msg };
                }
                return tab;
              }),
            );
          }
        }

        if (event.event === "data") {
          const docId = event.data.doc_id as string | null;
          const filename = event.data.filename as string;
          const status = event.data.status as string;
          const error = event.data.error as string | null;

          // Find the matching placeholder by filename, or use resultIndex
          const placeholderIdx = placeholderTabs.findIndex(
            (p, idx) =>
              idx >= resultIndex &&
              p.filename === filename &&
              p.status === "extracting",
          );
          const targetPlaceholder =
            placeholderIdx >= 0
              ? placeholderTabs[placeholderIdx]
              : placeholderTabs[resultIndex];
          resultIndex++;

          if (!targetPlaceholder) continue;

          if (status === "done" && docId) {
            // Fetch the full document
            const doc = await fetchDocument(docId);
            const newTabId = docId;

            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === targetPlaceholder.id
                  ? {
                      ...tab,
                      id: newTabId,
                      filename: doc?.name ?? filename,
                      status: "done" as const,
                      error: null,
                      document: doc,
                      progressMessage: undefined,
                    }
                  : tab,
              ),
            );

            // Update activeTabId if it was pointing to the placeholder
            setActiveTabId((prev) =>
              prev === targetPlaceholder.id ? newTabId : prev,
            );

            if (!firstCompletedTabRef.current) {
              firstCompletedTabRef.current = newTabId;
            }
          } else if (status === "error") {
            setTabs((prev) =>
              prev.map((tab) =>
                tab.id === targetPlaceholder.id
                  ? {
                      ...tab,
                      status: "error" as const,
                      error: error ?? "Extraction failed",
                      progressMessage: undefined,
                    }
                  : tab,
              ),
            );
          }
        }

        if (event.event === "end") {
          break;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      // Mark remaining extracting placeholders as error
      setTabs((prev) =>
        prev.map((tab) =>
          placeholderTabs.some((p) => p.id === tab.id) &&
          tab.status === "extracting"
            ? { ...tab, status: "error" as const, error: msg }
            : tab,
        ),
      );
    } finally {
      setBatchStatus("idle");
      clearFiles();
      // Refresh history
      loadHistory();

      // Switch to first completed tab
      if (firstCompletedTabRef.current) {
        setActiveTabId(firstCompletedTabRef.current);
      }
    }
  }, [
    selectedFiles,
    backendUrl,
    getAuthHeaders,
    fetchDocument,
    clearFiles,
    loadHistory,
  ]);

  // ── Open a document from history (sidebar click) ───────────────────────────

  const openDocument = useCallback(
    (doc: PdfDocument) => {
      // Check if tab already exists
      const existing = tabs.find((t) => t.id === doc.id);
      if (existing) {
        setActiveTabId(doc.id);
        return;
      }

      // Create a new tab
      const newTab: ExtractionTab = {
        id: doc.id,
        filename: doc.name,
        status: "done",
        error: null,
        document: doc,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(doc.id);
    },
    [tabs],
  );

  // ── Close a tab ────────────────────────────────────────────────────────────

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === tabId);
        const filtered = prev.filter((t) => t.id !== tabId);

        // If closing the active tab, switch to adjacent or "new"
        if (activeTabId === tabId) {
          if (filtered.length > 0) {
            const newIdx = Math.min(idx, filtered.length - 1);
            setActiveTabId(filtered[newIdx].id);
          } else {
            setActiveTabId("new");
          }
        }

        return filtered;
      });
    },
    [activeTabId],
  );

  // ── AI Content Cleaning ────────────────────────────────────────────────────

  const cleanContent = useCallback(
    async (docId: string) => {
      // Set tab to cleaning status
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === docId
            ? { ...tab, status: "cleaning" as const, progressMessage: "Starting AI cleanup..." }
            : tab,
        ),
      );

      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `${backendUrl}${ENDPOINTS.pdf.cleanContent(docId)}`,
          {
            method: "POST",
            headers,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let cleanedText: string | null = null;

        for await (const event of readNdjsonStream(response)) {
          if (event.event === "info") {
            const msg =
              (event.data.user_message as string) ??
              (event.data.message as string);
            if (msg) {
              setTabs((prev) =>
                prev.map((tab) =>
                  tab.id === docId ? { ...tab, progressMessage: msg } : tab,
                ),
              );
            }
          }

          if (event.event === "data") {
            cleanedText = (event.data.clean_content as string) ?? null;
          }
        }

        // Update tab with cleaned content
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === docId && tab.document
              ? {
                  ...tab,
                  status: "done" as const,
                  progressMessage: undefined,
                  document: {
                    ...tab.document,
                    cleanContent: cleanedText,
                  },
                }
              : tab,
          ),
        );
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "AI cleanup failed";
        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === docId
              ? {
                  ...tab,
                  status: "done" as const,
                  error: msg,
                  progressMessage: undefined,
                }
              : tab,
          ),
        );
      }
    },
    [backendUrl, getAuthHeaders],
  );

  // ── Copy text ──────────────────────────────────────────────────────────────

  const copyText = useCallback(
    async (tabId?: string) => {
      const targetId = tabId ?? activeTabId;
      if (targetId === "new") return;
      const tab = tabs.find((t) => t.id === targetId);
      const text = tab?.document?.content;
      if (text) {
        await navigator.clipboard.writeText(text);
      }
    },
    [tabs, activeTabId],
  );

  // ── Derived state ──────────────────────────────────────────────────────────

  const activeTab =
    activeTabId === "new"
      ? null
      : tabs.find((t) => t.id === activeTabId) ?? null;

  const openTabIds = new Set(tabs.map((t) => t.id));

  return {
    // Tab management
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    closeTab,
    openTabIds,

    // History
    history,
    historyLoading,
    loadHistory,
    openDocument,

    // "New" tab state
    selectedFiles,
    batchStatus,
    fileInputRef,
    addFiles,
    removeFile,
    clearFiles,
    extractFiles,

    // Actions
    cleanContent,
    copyText,
    fetchDocument,
  };
}
