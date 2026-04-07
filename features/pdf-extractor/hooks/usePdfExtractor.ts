"use client";

import { useState, useCallback, useRef } from "react";
import { useApiAuth } from "@/hooks/useApiAuth";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectResolvedBaseUrl } from "@/lib/redux/slices/apiConfigSlice";
import { ENDPOINTS } from "@/lib/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfExtractionResult {
  filename: string;
  text: string;
  charCount: number;
  wordCount: number;
  pageCount?: number;
  requestTimeMs: number;
}

export interface PdfHistoryItem {
  id: string;
  filename: string;
  fileSize: number;
  fileType: string;
  result: PdfExtractionResult;
  timestamp: Date;
}

export type ExtractionStatus = "idle" | "loading" | "success" | "error";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePdfExtractor() {
  const { getHeaders, waitForAuth } = useApiAuth();
  const backendUrl = useAppSelector(selectResolvedBaseUrl);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PdfExtractionResult | null>(null);
  const [history, setHistory] = useState<PdfHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectFile = useCallback((file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      setResult(null);
      setError(null);
      setStatus("idle");
      return;
    }

    const isValid =
      file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isValid) {
      setError(
        `Unsupported file type: ${file.type}. Please select a PDF or image.`,
      );
      setStatus("error");
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setError(null);
    setStatus("idle");
  }, []);

  const extract = useCallback(async () => {
    if (!selectedFile) return;

    const startTime = performance.now();
    setStatus("loading");
    setError(null);
    setResult(null);

    try {
      await waitForAuth();

      const authHeaders = getHeaders();
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Strip Content-Type so browser sets multipart/form-data boundary correctly
      const { "Content-Type": _removed, ...headersWithoutContentType } =
        authHeaders as Record<string, string>;

      const response = await fetch(
        `${backendUrl}${ENDPOINTS.utilities.pdfExtractText}`,
        {
          method: "POST",
          headers: headersWithoutContentType,
          body: formData,
        },
      );

      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg =
            errorData.detail ||
            errorData.error ||
            errorData.message ||
            errorMsg;
        } catch {
          // Use default error
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      const requestTimeMs = performance.now() - startTime;

      const text: string = data.text_content || data.text || data.content || "";
      const charCount = text.length;
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

      const extractionResult: PdfExtractionResult = {
        filename: data.filename || selectedFile.name,
        text,
        charCount,
        wordCount,
        pageCount: data.page_count || data.pageCount,
        requestTimeMs,
      };

      setResult(extractionResult);
      setStatus("success");

      // Add to history
      const historyItem: PdfHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        filename: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        result: extractionResult,
        timestamp: new Date(),
      };
      setHistory((prev) => [historyItem, ...prev].slice(0, 20));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extraction failed";
      setError(msg);
      setStatus("error");
    }
  }, [selectedFile, backendUrl, getHeaders, waitForAuth]);

  const clearFile = useCallback(() => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    setStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const loadFromHistory = useCallback((item: PdfHistoryItem) => {
    setResult(item.result);
    setStatus("success");
    setError(null);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const copyText = useCallback(async () => {
    if (result?.text) {
      await navigator.clipboard.writeText(result.text);
    }
  }, [result]);

  return {
    selectedFile,
    status,
    error,
    result,
    history,
    fileInputRef,
    selectFile,
    extract,
    clearFile,
    loadFromHistory,
    clearHistory,
    copyText,
    isLoading: status === "loading",
    hasResult: status === "success" && result !== null,
  };
}
