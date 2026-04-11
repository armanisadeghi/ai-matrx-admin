"use client";

import React, { useCallback, useState } from "react";
import {
  Upload,
  Loader2,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Hash,
  Copy,
  Check,
  FileSearch,
  ChevronRight,
  Trash2,
  Bot,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  usePdfExtractor,
  type PdfHistoryItem,
  type ExtractionStatus,
  type PdfExtractionResult,
} from "../hooks/usePdfExtractor";
import { WindowPanel } from "@/features/window-panels/WindowPanel";

// ─── Tab type ────────────────────────────────────────────────────────────────

type ActiveTab = "text" | "preview" | "metadata" | "agent";

// ─── PdfExtractorShell — shared state parent ─────────────────────────────────
// Used by both the window variant and any standalone embedding.

export function PdfExtractorShell() {
  const extractor = usePdfExtractor();

  return (
    <PdfExtractorWindowContent
      extractor={extractor}
      sidebar={
        <PdfExtractorSidebar
          history={extractor.history}
          onSelect={extractor.loadFromHistory}
          onClear={extractor.clearHistory}
        />
      }
    />
  );
}

// ─── PdfExtractorWindowContent ────────────────────────────────────────────────

interface ExtractorApi {
  selectedFile: File | null;
  status: ExtractionStatus;
  error: string | null;
  result: PdfExtractionResult | null;
  history: PdfHistoryItem[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  selectFile: (file: File | null) => void;
  extract: () => Promise<void>;
  clearFile: () => void;
  loadFromHistory: (item: PdfHistoryItem) => void;
  clearHistory: () => void;
  copyText: () => Promise<void>;
  isLoading: boolean;
  hasResult: boolean;
}

function PdfExtractorWindowContent({
  extractor,
  sidebar,
}: {
  extractor: ExtractorApi;
  sidebar?: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("text");
  const [copied, setCopied] = useState(false);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      extractor.selectFile(e.target.files?.[0] ?? null);
    },
    [extractor],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) extractor.selectFile(file);
    },
    [extractor],
  );

  const handleCopy = useCallback(async () => {
    await extractor.copyText();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [extractor]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── File selector ───────────────────────────────────────── */}
      <div className="shrink-0 px-3 pt-2.5 pb-2">
        <input
          ref={extractor.fileInputRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleFileInputChange}
          disabled={extractor.isLoading}
          className="hidden"
        />

        {extractor.selectedFile ? (
          <div className="flex items-center gap-2 px-2.5 py-2 bg-muted/50 border border-border rounded-lg">
            <div className="shrink-0 w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight">
                {extractor.selectedFile.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {(extractor.selectedFile.size / 1024).toFixed(1)} KB ·{" "}
                {extractor.selectedFile.type === "application/pdf"
                  ? "PDF"
                  : "Image"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => extractor.fileInputRef.current?.click()}
                disabled={extractor.isLoading}
                className="px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border rounded hover:bg-accent transition-colors disabled:opacity-50"
              >
                Change
              </button>
              <Button
                onClick={extractor.extract}
                disabled={extractor.isLoading}
                size="sm"
                className="h-6 text-xs px-2.5"
              >
                {extractor.isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Extracting
                  </>
                ) : (
                  "Extract"
                )}
              </Button>
              <button
                type="button"
                onClick={extractor.clearFile}
                disabled={extractor.isLoading}
                className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-50"
                aria-label="Clear file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => extractor.fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer group"
          >
            <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              Drop a PDF or image, or{" "}
              <span className="text-primary underline">browse</span>
            </span>
          </button>
        )}

        {extractor.error && (
          <div className="flex items-start gap-1.5 mt-2 px-2.5 py-1.5 bg-destructive/10 border border-destructive/20 rounded-md">
            <AlertCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
            <span className="text-[11px] text-destructive leading-snug">
              {extractor.error}
            </span>
          </div>
        )}
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      {extractor.hasResult && extractor.result && (
        <div className="shrink-0 px-3 pb-2">
          <div className="grid grid-cols-4 gap-1.5">
            <StatChip
              icon={<CheckCircle className="w-3 h-3 text-emerald-500" />}
              label="Status"
              value="Done"
              valueClass="text-emerald-600 dark:text-emerald-400"
            />
            <StatChip
              icon={<Hash className="w-3 h-3 text-muted-foreground" />}
              label="Chars"
              value={extractor.result.charCount.toLocaleString()}
            />
            <StatChip
              icon={<Hash className="w-3 h-3 text-muted-foreground" />}
              label="Words"
              value={extractor.result.wordCount.toLocaleString()}
            />
            <StatChip
              icon={<Clock className="w-3 h-3 text-muted-foreground" />}
              label="Time"
              value={`${extractor.result.requestTimeMs.toFixed(0)}ms`}
            />
          </div>
        </div>
      )}

      {/* ── Tab strip ─────────────────────────────────────────────── */}
      {extractor.hasResult && (
        <div className="shrink-0 flex items-center gap-0 px-3 border-b border-border">
          <TabBtn
            active={activeTab === "text"}
            onClick={() => setActiveTab("text")}
            icon={<FileText className="w-3 h-3" />}
            label="Raw Text"
          />
          <TabBtn
            active={activeTab === "preview"}
            onClick={() => setActiveTab("preview")}
            icon={<Eye className="w-3 h-3" />}
            label="Preview"
          />
          <TabBtn
            active={activeTab === "metadata"}
            onClick={() => setActiveTab("metadata")}
            icon={<FileSearch className="w-3 h-3" />}
            label="Metadata"
          />
          <TabBtn
            active={activeTab === "agent"}
            onClick={() => setActiveTab("agent")}
            icon={<Bot className="w-3 h-3" />}
            label="AI Clean"
            badge="Soon"
          />
        </div>
      )}

      {/* ── Tab content / idle state ───────────────────────────── */}
      {extractor.hasResult && extractor.result ? (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {activeTab === "text" && (
            <div className="p-3">
              {extractor.result.text ? (
                <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {extractor.result.text}
                </pre>
              ) : (
                <EmptyState message="No text extracted from this file" />
              )}
            </div>
          )}

          {activeTab === "preview" && (
            <div className="p-3">
              {extractor.result.text ? (
                <div className="bg-card border border-border rounded-lg p-3">
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-line">
                    {extractor.result.text.slice(0, 2000)}
                    {extractor.result.text.length > 2000 && (
                      <span className="text-muted-foreground">
                        {" "}
                        …&nbsp;(
                        {(
                          extractor.result.text.length - 2000
                        ).toLocaleString()}{" "}
                        more chars)
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <EmptyState message="No content to preview" />
              )}
            </div>
          )}

          {activeTab === "metadata" && (
            <div className="p-3 space-y-1.5">
              <MetaRow label="Filename" value={extractor.result.filename} />
              {extractor.result.pageCount != null && (
                <MetaRow
                  label="Pages"
                  value={String(extractor.result.pageCount)}
                />
              )}
              <MetaRow
                label="Characters"
                value={extractor.result.charCount.toLocaleString()}
              />
              <MetaRow
                label="Words"
                value={extractor.result.wordCount.toLocaleString()}
              />
              <MetaRow
                label="Processing Time"
                value={`${extractor.result.requestTimeMs.toFixed(0)} ms`}
              />
              {extractor.selectedFile && (
                <>
                  <MetaRow
                    label="File Size"
                    value={`${(extractor.selectedFile.size / 1024).toFixed(1)} KB`}
                  />
                  <MetaRow
                    label="File Type"
                    value={extractor.selectedFile.type || "unknown"}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === "agent" && (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-3 h-full">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Text Cleanup</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[220px]">
                  Trigger an AI agent to clean up extracted text and return
                  structured output.
                </p>
              </div>
              <button
                type="button"
                disabled
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground border border-border cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          )}
        </div>
      ) : extractor.isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 text-primary/60 animate-spin" />
          <p className="text-xs text-muted-foreground">Processing document…</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 text-center">
          <FileSearch className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-xs text-muted-foreground">
            {extractor.selectedFile
              ? "Click Extract to process the file"
              : "Select a PDF or image to get started"}
          </p>
        </div>
      )}

      {/* ── In-body copy (visible when the window footer isn't used) ─── */}
      {extractor.hasResult && extractor.result?.text && (
        <div className="shrink-0 flex items-center justify-end px-3 py-1.5 border-t border-border bg-muted/10">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border border-border bg-background hover:bg-accent text-foreground transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" />
                Copy Text
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── PdfExtractorSidebar ─────────────────────────────────────────────────────

export function PdfExtractorSidebar({
  history,
  onSelect,
  onClear,
}: {
  history: PdfHistoryItem[];
  onSelect: (item: PdfHistoryItem) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-2 py-1.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
          History
        </span>
        {history.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="p-0.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors rounded"
            title="Clear history"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 p-1 space-y-0.5">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[10px] text-muted-foreground/40 italic text-center px-2">
              Extracted files appear here
            </p>
          </div>
        ) : (
          history.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="w-full flex items-start gap-1.5 px-1.5 py-1.5 rounded hover:bg-accent transition-colors text-left group"
            >
              <div className="shrink-0 w-5 h-5 rounded bg-primary/10 flex items-center justify-center mt-0.5">
                <FileText className="w-2.5 h-2.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate text-foreground/80 group-hover:text-foreground leading-tight">
                  {item.filename}
                </p>
                <p className="text-[9px] text-muted-foreground/50 leading-tight">
                  {item.result.charCount.toLocaleString()} chars ·{" "}
                  {item.result.wordCount.toLocaleString()} words
                </p>
              </div>
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/30 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── PdfExtractorFloatingWorkspace ────────────────────────────────────────────
// Full self-contained floating window: holds shared state + WindowPanel + sidebar.

export function PdfExtractorFloatingWorkspace({
  onClose,
}: {
  onClose: () => void;
}) {
  const extractor = usePdfExtractor();

  return (
    <WindowPanel
      id="pdf-extractor"
      title="PDF Extractor"
      onClose={onClose}
      width={680}
      height={560}
      minWidth={420}
      minHeight={320}
      position="center"
      overlayId="pdfExtractorWindow"
      onCollectData={() => ({ history: extractor.history, currentIndex: null })}
      sidebar={
        <PdfExtractorSidebar
          history={extractor.history}
          onSelect={extractor.loadFromHistory}
          onClear={extractor.clearHistory}
        />
      }
      sidebarDefaultSize={200}
      sidebarMinSize={150}
      defaultSidebarOpen={true}
      sidebarClassName="bg-muted/10"
      urlSyncKey="pdf_extractor"
      urlSyncId="default"
      footer={
        <>
          <span className="text-[10px] text-muted-foreground">
            Supports PDF · PNG · JPG · WEBP
          </span>
          <div className="flex-1" />
          {extractor.hasResult && extractor.result?.text && (
            <CopyFooterButton onCopy={extractor.copyText} />
          )}
        </>
      }
    >
      <PdfExtractorWindowContent extractor={extractor} />
    </WindowPanel>
  );
}

// ─── CopyFooterButton ─────────────────────────────────────────────────────────

function CopyFooterButton({ onCopy }: { onCopy: () => Promise<void> }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [onCopy]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border border-border bg-background hover:bg-accent text-foreground transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-2.5 h-2.5 text-emerald-500" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-2.5 h-2.5" />
          Copy Text
        </>
      )}
    </button>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function StatChip({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-md px-2 py-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        {icon}
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "text-xs font-semibold tabular-nums truncate",
          valueClass,
        )}
      >
        {value}
      </p>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium border-b-2 transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {badge && (
        <span className="px-1 text-[8px] font-semibold bg-muted text-muted-foreground rounded leading-none py-0.5">
          {badge}
        </span>
      )}
    </button>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 px-2.5 py-1.5 bg-card border border-border rounded-md">
      <span className="text-[10px] font-medium text-muted-foreground shrink-0 w-28">
        {label}
      </span>
      <span className="text-[10px] text-foreground/80 break-all">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <FileSearch className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
      <p className="text-[11px] text-muted-foreground">{message}</p>
    </div>
  );
}
