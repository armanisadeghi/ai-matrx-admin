"use client";

/**
 * /rag/search — single-page RAG search UI.
 *
 * Layout:
 *   - top bar: query input, data-store selector (optional), source-kind filter
 *   - left rail: store list (the user's stores) for one-click scoping
 *   - main: result list, each hit clickable → /rag/viewer/{processed_document_id}
 *           when the hit's source is a processed_document we know about.
 *
 * Auth: same as other RAG pages — Supabase RLS via `useDataStores`,
 * Bearer-token search via `ragSearch`.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  Database,
  FileText,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ragSearch,
  type RagSearchHit,
  type RagSearchResponse,
} from "@/features/rag/api/search";
import { useDataStores } from "@/features/rag/hooks/useDataStores";

type SourceKindFilter = "all" | "cld_file" | "note" | "code_file" | "library";

export function RagSearchPage() {
  const router = useRouter();
  const params = useSearchParams();

  const initialQuery = params?.get("q") ?? "";
  const initialStoreId = params?.get("store_id") ?? null;

  const [query, setQuery] = useState(initialQuery);
  const [storeId, setStoreId] = useState<string | null>(initialStoreId);
  const [kindFilter, setKindFilter] = useState<SourceKindFilter>("all");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<RagSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stores = useDataStores();

  const sourceKinds = useMemo<
    ("cld_file" | "note" | "code_file")[] | undefined
  >(() => {
    if (kindFilter === "all") return undefined;
    if (kindFilter === "library") return ["cld_file"];
    return [kindFilter];
  }, [kindFilter]);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setRunning(true);
      setError(null);
      setResponse(null);
      try {
        const r = await ragSearch({
          query: trimmed,
          limit: 25,
          rerank: true,
          only_children: true,
          data_store_id: storeId ?? undefined,
          filters: sourceKinds ? { source_kinds: sourceKinds } : undefined,
        });
        // Library filter is "library_short_code IS NOT NULL" — apply
        // client-side because the HTTP filter doesn't expose it directly.
        if (kindFilter === "library") {
          r.hits = r.hits.filter((h) => {
            const md = (h.metadata?.source ?? {}) as Record<string, unknown>;
            return Boolean(md.library_short_code);
          });
        }
        setResponse(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        setRunning(false);
      }
    },
    [storeId, sourceKinds, kindFilter],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Persist q + store_id in URL so deep links work.
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (storeId) next.set("store_id", storeId);
    router.replace(`/rag/search${next.toString() ? `?${next}` : ""}`);
    runSearch(query);
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] bg-background">
      {/* Left rail — data store picker */}
      <aside className="w-64 border-r flex flex-col overflow-hidden shrink-0">
        <div className="px-3 py-2 border-b flex items-center gap-2">
          <Database className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold flex-1">Scope</h2>
        </div>
        <div className="flex-1 overflow-auto">
          <ScopeRow
            label="All accessible content"
            sublabel="Your docs + org + global library"
            selected={storeId === null}
            onClick={() => setStoreId(null)}
          />
          {stores.loading && (
            <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading stores…
            </div>
          )}
          {stores.stores.map((s) => (
            <ScopeRow
              key={s.id}
              label={s.name}
              sublabel={`${s.memberCount} members${s.kind ? ` · ${s.kind}` : ""}`}
              selected={s.id === storeId}
              onClick={() => setStoreId(s.id)}
            />
          ))}
        </div>
      </aside>

      {/* Main */}
      <section className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b">
          <form
            onSubmit={onSubmit}
            className="px-4 py-3 flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search indexed content (PDFs, notes, code)…"
                className="pl-9 h-10"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResponse(null);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
            <KindToggle value={kindFilter} onChange={setKindFilter} />
            <Button type="submit" disabled={!query.trim() || running}>
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>
          {storeId && (
            <div className="px-4 pb-2 -mt-1 text-xs text-muted-foreground">
              Scoped to{" "}
              <strong className="text-foreground">
                {stores.stores.find((s) => s.id === storeId)?.name ??
                  "(unknown store)"}
              </strong>
              <button
                onClick={() => setStoreId(null)}
                className="ml-2 underline hover:text-foreground"
              >
                clear
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto">
          {error && (
            <div className="m-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          {!response && !running && !error && <EmptyState />}
          {response && <Results response={response} />}
        </div>
      </section>
    </div>
  );
}

function ScopeRow({
  label,
  sublabel,
  selected,
  onClick,
}: {
  label: string;
  sublabel: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted/40",
        selected && "bg-muted/60",
      )}
    >
      <div className="text-xs font-medium truncate">{label}</div>
      <div className="text-[10px] text-muted-foreground truncate">
        {sublabel}
      </div>
    </button>
  );
}

function KindToggle({
  value,
  onChange,
}: {
  value: SourceKindFilter;
  onChange: (v: SourceKindFilter) => void;
}) {
  const options: { v: SourceKindFilter; label: string }[] = [
    { v: "all", label: "All" },
    { v: "cld_file", label: "Files" },
    { v: "library", label: "Library" },
    { v: "note", label: "Notes" },
    { v: "code_file", label: "Code" },
  ];
  return (
    <div className="flex items-center rounded-md border p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "px-2.5 py-1 rounded transition-colors",
            value === o.v
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted/40 text-muted-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="m-6 max-w-2xl rounded-md border bg-muted/20 p-6 text-sm text-muted-foreground">
      <p className="font-medium text-foreground mb-2">
        Search your indexed content
      </p>
      <p className="mb-2">
        Type a natural-language query above. Results are ranked by hybrid
        retrieval (vector + lexical + Cohere rerank). Pick a data store on the
        left to scope to one curated bucket; leave it on{" "}
        <em>All accessible content</em> to search everything you can see — your
        docs, your org's docs, and the global library (regulatory guidelines,
        etc.).
      </p>
      <p className="mb-2">
        Each hit links into the document viewer at the page that produced it.
      </p>
      <p className="text-xs text-muted-foreground/70">
        Tip: prefix a query with a topic name to bias toward it. The retrieval
        layer also handles paraphrasing and synonyms.
      </p>
    </div>
  );
}

function Results({ response }: { response: RagSearchResponse }) {
  if (response.hits.length === 0) {
    return (
      <div className="m-6 text-sm text-muted-foreground">
        No hits for{" "}
        <strong className="text-foreground">"{response.query}"</strong>. Try
        broadening your scope (left rail) or simplifying the query.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="text-xs text-muted-foreground tabular-nums">
        {response.hits.length} hits · {response.total_candidates} candidates ·{" "}
        {response.latency_ms} ms
        {response.reranker_model && ` · reranked by ${response.reranker_model}`}
      </div>
      {response.hits.map((h, i) => (
        <HitCard key={h.chunk_id} hit={h} index={i} />
      ))}
    </div>
  );
}

function HitCard({ hit, index }: { hit: RagSearchHit; index: number }) {
  const meta = (hit.metadata ?? {}) as Record<string, unknown>;
  const source = (meta.source ?? {}) as Record<string, unknown>;
  const libraryShortCode = source.library_short_code as string | undefined;
  const fileName =
    (source.file_name as string | undefined) ??
    (source.title as string | undefined) ??
    (source.path as string | undefined) ??
    null;
  const pageNumber =
    (meta.page_number as number | undefined) ??
    (meta.first_page as number | undefined) ??
    null;

  // For now, link to the document viewer when source is a cld_file.
  // (Once we add a "find processed_document for this cld_file_id" hook
  //  we can resolve the right viewer URL more accurately.)
  const href =
    hit.source_kind === "cld_file"
      ? `/files/f/${hit.source_id}?tab=document${pageNumber ? `&page=${pageNumber}` : ""}`
      : hit.source_kind === "note"
        ? `/notes/${hit.source_id}`
        : hit.source_kind === "code_file"
          ? `/code/${hit.source_id}`
          : null;

  const Tag = href ? "a" : "div";
  return (
    <Tag
      href={href ?? undefined}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      className={cn(
        "block rounded-md border bg-card p-3 hover:bg-muted/30 transition-colors",
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
        <span className="tabular-nums w-5 text-right">#{index + 1}</span>
        <FileText className="h-3.5 w-3.5" />
        <span className="font-mono uppercase tracking-wide">
          {hit.source_kind}
        </span>
        {libraryShortCode && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
            library · {libraryShortCode}
          </span>
        )}
        {fileName && <span className="truncate">{fileName}</span>}
        {pageNumber !== null && (
          <span className="ml-auto whitespace-nowrap">page {pageNumber}</span>
        )}
        <span className="ml-auto tabular-nums">
          score {hit.score.toFixed(3)}
        </span>
      </div>
      <div className="text-sm whitespace-pre-wrap line-clamp-6 text-foreground">
        {hit.snippet}
      </div>
    </Tag>
  );
}
