"use client";

/**
 * Detail drilldown for one processed document.
 *
 * Three tabs:
 *   - Overview  — counts, lineage, data-store bindings, copy-id buttons
 *   - Pages     — first ~25 pages with cleaned + raw preview side-by-side
 *   - Chunks    — sample chunks with embedding presence + content preview
 *
 * Goals:
 *   - Make it impossible to "lose" a document — everything we have on
 *     it is visible from this sheet.
 *   - Cheap roundtrip: server returns previews truncated at ~400 chars;
 *     full-text rendering happens in the 4-pane viewer.
 */

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Copy, Check, Database, FileText, Layers } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "./StatusBadge";
import { useLibraryDoc } from "../hooks/useLibrary";

export interface LibraryDocDetailSheetProps {
  processedDocumentId: string | null;
  onClose: () => void;
}

export function LibraryDocDetailSheet({
  processedDocumentId,
  onClose,
}: LibraryDocDetailSheetProps) {
  const { doc, loading, error } = useLibraryDoc(processedDocumentId);
  const [copiedId, setCopiedId] = useState(false);

  const open = Boolean(processedDocumentId);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-[min(100vw,900px)] sm:max-w-none flex flex-col p-0"
      >
        {loading || !doc ? (
          <div className="p-6 space-y-3">
            <SheetHeader>
              <SheetTitle>Loading document…</SheetTitle>
            </SheetHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Error</SheetTitle>
              <SheetDescription className="text-destructive">{error}</SheetDescription>
            </SheetHeader>
          </div>
        ) : (
          <>
            <SheetHeader className="p-6 pb-3 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate">{doc.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-1.5">
                    <StatusBadge status={doc.status} />
                    <span className="text-xs text-muted-foreground">
                      {doc.derivationKind} · created{" "}
                      {new Date(doc.createdAt).toLocaleString()}
                    </span>
                  </SheetDescription>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(doc.id);
                      setCopiedId(true);
                      toast.success("Document ID copied");
                      setTimeout(() => setCopiedId(false), 1500);
                    }}
                  >
                    {copiedId ? (
                      <Check className="h-3.5 w-3.5 mr-1" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copy ID
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      window.open(
                        `/rag/viewer/${doc.id}`,
                        "_blank",
                        "noopener,noreferrer",
                      );
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    4-pane viewer
                  </Button>
                </div>
              </div>

              {/* Counts strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 text-xs">
                <CountChip
                  icon={<FileText className="h-3 w-3" />}
                  label="Pages"
                  value={`${doc.pagesPersisted}${doc.totalPages ? ` / ${doc.totalPages}` : ""}`}
                />
                <CountChip
                  icon={<Layers className="h-3 w-3" />}
                  label="Chunks"
                  value={String(doc.chunks)}
                />
                <CountChip
                  icon={<Sparkle />}
                  label="OAI emb."
                  value={`${doc.embeddingsOai} / ${doc.chunks}`}
                  highlight={
                    doc.chunks > 0 && doc.embeddingsOai < doc.chunks
                      ? "warning"
                      : "ok"
                  }
                />
                <CountChip
                  icon={<Sparkle />}
                  label="Voyage emb."
                  value={String(doc.embeddingsVoyage)}
                />
                <CountChip
                  icon={<Database className="h-3 w-3" />}
                  label="Data stores"
                  value={String(doc.dataStores.length)}
                  highlight={
                    doc.dataStores.length === 0 ? "warning" : "ok"
                  }
                />
              </div>
            </SheetHeader>

            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-6 mt-3 self-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="pages">Pages ({doc.pagesPersisted})</TabsTrigger>
                <TabsTrigger value="chunks">Chunks ({doc.chunks})</TabsTrigger>
              </TabsList>

              <TabsContent
                value="overview"
                className="flex-1 min-h-0 mt-2 px-6 pb-6"
              >
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-3">
                    <Section title="Identity">
                      <KV k="Document ID" v={<code className="text-xs">{doc.id}</code>} />
                      <KV k="Source" v={<span>{doc.sourceKind} · <code className="text-xs">{doc.sourceId}</code></span>} />
                      <KV k="MIME" v={doc.mimeType ?? "—"} />
                      <KV
                        k="Storage URI"
                        v={
                          doc.storageUri ? (
                            <code className="text-xs break-all">{doc.storageUri}</code>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <KV k="Has structured JSON" v={doc.hasStructuredJson ? "yes" : "no"} />
                    </Section>

                    <Section title="Lineage">
                      <KV k="Derivation" v={doc.derivationKind} />
                      <KV
                        k="Parent"
                        v={
                          doc.parentProcessedId ? (
                            <code className="text-xs">{doc.parentProcessedId}</code>
                          ) : (
                            "(none — initial extract)"
                          )
                        }
                      />
                    </Section>

                    <Section title="Data-store bindings">
                      {doc.dataStores.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Not bound to any data store. Bind it on the{" "}
                          <a
                            href="/rag/data-stores"
                            className="underline"
                            target="_blank"
                          >
                            Data Stores page
                          </a>{" "}
                          to make it searchable by an agent.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {doc.dataStores.map((s) => (
                            <Badge
                              key={s.dataStoreId}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => {
                                window.open(
                                  `/rag/data-stores?store_id=${s.dataStoreId}`,
                                  "_blank",
                                );
                              }}
                            >
                              <Database className="h-3 w-3 mr-1" />
                              {s.name}
                              {s.shortCode ? ` · ${s.shortCode}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Section>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="pages"
                className="flex-1 min-h-0 mt-2 px-6 pb-6"
              >
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-3">
                    {doc.pages.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No pages persisted yet.
                      </p>
                    ) : (
                      doc.pages.map((p) => (
                        <div
                          key={p.pageIndex}
                          className="border rounded-md p-3 space-y-2 bg-card"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">Page {p.pageNumber}</Badge>
                            {p.extractionMethod && (
                              <Badge variant="outline">{p.extractionMethod}</Badge>
                            )}
                            {p.usedOcr && <Badge variant="warning">OCR</Badge>}
                            {p.sectionKind && (
                              <Badge variant="info">{p.sectionKind}</Badge>
                            )}
                            {p.isContinuation && (
                              <Badge variant="secondary">cont.</Badge>
                            )}
                            <span className="ml-auto">
                              raw {p.rawCharCount.toLocaleString()} ch · clean{" "}
                              {p.cleanedCharCount.toLocaleString()} ch
                            </span>
                          </div>
                          {p.sectionTitle && (
                            <p className="text-sm font-medium">{p.sectionTitle}</p>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                            <PreviewBlock
                              label="Cleaned"
                              text={p.cleanedPreview}
                            />
                            <PreviewBlock label="Raw" text={p.rawPreview} />
                          </div>
                        </div>
                      ))
                    )}
                    {doc.pagesPersisted > doc.pages.length && (
                      <p className="text-xs text-muted-foreground italic">
                        Showing first {doc.pages.length} of{" "}
                        {doc.pagesPersisted} pages. Open the 4-pane viewer for
                        the rest.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent
                value="chunks"
                className="flex-1 min-h-0 mt-2 px-6 pb-6"
              >
                <ScrollArea className="h-full">
                  <div className="space-y-3 pr-3">
                    {doc.sampleChunks.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No chunks yet — extraction completed but chunking has
                        not run, or it failed.
                      </p>
                    ) : (
                      doc.sampleChunks.map((c) => (
                        <div
                          key={c.id}
                          className="border rounded-md p-3 space-y-2 bg-card"
                        >
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">
                              #{c.chunkIndex ?? "?"}
                            </Badge>
                            {c.chunkKind && (
                              <Badge variant="outline">{c.chunkKind}</Badge>
                            )}
                            {c.tokenCount && (
                              <Badge variant="outline">
                                {c.tokenCount.toLocaleString()} tok
                              </Badge>
                            )}
                            {c.pageNumbers && c.pageNumbers.length > 0 && (
                              <Badge variant="outline">
                                pp.{" "}
                                {c.pageNumbers.length === 1
                                  ? c.pageNumbers[0]
                                  : `${c.pageNumbers[0]}–${c.pageNumbers[c.pageNumbers.length - 1]}`}
                              </Badge>
                            )}
                            <span className="ml-auto flex gap-1">
                              {c.hasOaiEmbedding && (
                                <Badge variant="success">OAI</Badge>
                              )}
                              {c.hasVoyageEmbedding && (
                                <Badge variant="success">Voyage</Badge>
                              )}
                              {!c.hasOaiEmbedding && !c.hasVoyageEmbedding && (
                                <Badge variant="error">no embedding</Badge>
                              )}
                            </span>
                          </div>
                          <PreviewBlock label="" text={c.contentPreview} />
                        </div>
                      ))
                    )}
                    {doc.chunks > doc.sampleChunks.length && (
                      <p className="text-xs text-muted-foreground italic">
                        Showing first {doc.sampleChunks.length} of {doc.chunks}{" "}
                        chunks.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CountChip({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: "ok" | "warning";
}) {
  return (
    <div
      className={
        "rounded-md border p-2 flex flex-col gap-0.5 " +
        (highlight === "warning"
          ? "border-yellow-500/50 bg-yellow-500/5"
          : "bg-muted/30")
      }
    >
      <span className="flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="font-semibold text-sm text-foreground">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] text-sm gap-2">
      <span className="text-muted-foreground">{k}</span>
      <div className="min-w-0 break-words">{v}</div>
    </div>
  );
}

function PreviewBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="space-y-1">
      {label && (
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed bg-muted/30 rounded p-2 max-h-48 overflow-auto">
        {text || <span className="italic text-muted-foreground">(empty)</span>}
      </pre>
    </div>
  );
}

// Tiny inline icon to avoid pulling another import for the "Sparkle".
function Sparkle() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}
