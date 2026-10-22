"use client";

import { ReadFailure } from "@ai-matrx/design-system";
import { StaleDataNotice } from "@ai-matrx/design-system";
import { useState, useEffect, useMemo, useTransition } from "react";
import { toast } from "@/lib/toast";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  ADMIN_KNOWLEDGE_SURFACE_NAME,
  createAdminKnowledgeScope,
} from "@/features/surfaces/manifests/admin-knowledge.manifest";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2, Link, Mic, CheckCircle2, Circle } from "lucide-react";
import {
  MatrxDataTable,
  type MatrxColumnDef,
} from "@ai-matrx/design-system/data-table";
import { confirm } from "@/components/dialogs/confirm/ConfirmDialogHost";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { podcastService } from "../../service";
import type { PcShow } from "../../types";
import { InlineMediaRef } from "@ai-matrx/media/react";
import { EntityRef } from "@ai-matrx/records-ui/entity-ref";
import { PublicPageLink } from "./PublicPageLink";
import { podcastShowAdminHref } from "../../utils";
import {
  podcastShowSearchText,
  PODCAST_TABLE_ROW_ACTION_REVEAL_CLASS,
} from "./shows-table-contract";
import { pushAppHref, replaceAppHref } from "@/lib/deployment/navigate";
import { archiveConfirmSentence } from "@/features/trash/archiveCopy";
import { copyToClipboard } from "@/lib/clipboard/copy";

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void copyToClipboard(`${window.location.origin}/podcast/${slug}`).then((ok) => {
          if (!ok) return;
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className={`p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground ${PODCAST_TABLE_ROW_ACTION_REVEAL_CLASS}`}
      title={copied ? "Copied!" : "Copy the link to its page on the web"}
    >
      <Link className="h-3.5 w-3.5" />
    </button>
  );
}

export function ShowsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [shows, setShows] = useState<PcShow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // A failed read is said — never "No shows yet" (RC-B12 r13).
  const [loadError, setLoadError] = useState<unknown>(null);

  // URL-driven search state — survives refresh
  const search = searchParams.get("q") ?? "";

  const setSearch = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set("q", value);
      else params.delete("q");
      // Free-text search — replace so typing does not push per keystroke.
      replaceAppHref(
        router,
        `/administration/knowledge/podcasts/shows?${params.toString()}`,
      );
    });
  };

  const load = async () => {
    setIsLoading(true);
    try {
      setShows(await podcastService.fetchAllShows());
      setLoadError(null);
    } catch (e) {
      console.error("Failed to load shows", e);
      setLoadError(e ?? new Error("The shows read failed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // One declaration: the row's Edit / Delete and the bar's Delete twin (the same removeShow door).
  const openShow = (show: PcShow) =>
    startTransition(() => pushAppHref(router, podcastShowAdminHref(show.id)));
  const { rowActionDefs, bulkActions } = defineRowVerbs<PcShow>(
    [
      { id: "edit", icon: Pencil, label: "Edit show", onClick: openShow, bulk: false, noBulk: "edit" },
      {
        id: "delete",
        icon: Trash2,
        label: "Delete",
        tone: "destructive",
        onClick: (show) => {
          void (async () => {
            const ok = await confirm({
              title: "Delete show?",
              description: archiveConfirmSentence("the show"),
              confirmLabel: "Delete",
              variant: "destructive",
            });
            if (!ok) return;
            try {
              await podcastService.removeShow(show.id);
              setShows((prev) => prev.filter((s) => s.id !== show.id));
            } catch (e) {
              console.error("Delete failed", e);
              toast.error(`Couldn't delete the show: ${e instanceof Error ? e.message : String(e)}`);
            }
          })();
        },
        bulk: {
          done: "Deleted",
          removesRows: true,
          confirm: (targets) => ({
            title: `Delete ${targets.ids.length} show${targets.ids.length === 1 ? "" : "s"}?`,
            description: archiveConfirmSentence(targets.ids.length === 1 ? "the show" : "these shows"),
            confirmLabel: "Delete",
            variant: "destructive",
          }),
          runOne: async (id) => {
            await podcastService.removeShow(id);
            setShows((prev) => prev.filter((s) => s.id !== id));
          },
        },
      },
    ],
    { noun: "show", getRowId: (s) => s.id, getRowName: (s) => s.title },
  );
  const bulk = useTableBulkSelection<PcShow>({
    noun: "show",
    rows: shows,
    getRowId: (s) => s.id,
    getRowName: (s) => s.title,
    actions: bulkActions,
    standardBulkActions: false,
    onRefresh: () => {},
  });

  const columns = useMemo<MatrxColumnDef<PcShow>[]>(
    () => [
      {
        id: "show",
        header: "Show",
        accessorFn: (show) => show.title,
        cell: (show) => {
          return (
            <div className="flex items-center gap-2">
              <InlineMediaRef
                ref={show.image_url ?? null}
                size={{ width: 32, height: 32 }}
                fit="cover"
                rounded="md"
                fallbackIcon={<Mic className="h-4 w-4 text-muted-foreground" />}
                className="shrink-0"
                alt=""
              />
              <div className="min-w-0">
                <EntityRef
                  token="pc_show"
                  id={show.id}
                  name={show.title}
                  href={podcastShowAdminHref(show.id)}
                  showIcon={false}
                  className="max-w-[200px] font-medium"
                />
                <p className="text-xs text-muted-foreground">
                  {show.is_published ? "Published" : "Draft"}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "slug",
        header: "Slug",
        cell: (show) => (
          <span className="block max-w-[140px] truncate font-mono text-xs text-muted-foreground">
            <code className="font-mono">{show.slug}</code>
          </span>
        ),
      },
      {
        id: "author",
        header: "Author",
        accessorFn: (show) => show.author ?? "",
        cell: (show) => (
          <span className="block max-w-[140px] truncate text-sm text-muted-foreground">
            {show.author ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "is_published",
        header: "Published",
        cell: (show) =>
          show.is_published ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          ),
      },
    ],
    [],
  );

  return (
    <SurfaceRuntimeProvider
      surfaceName={ADMIN_KNOWLEDGE_SURFACE_NAME}
      getScope={() =>
        createAdminKnowledgeScope({
          knowledge_section: "podcasts_shows",
          podcast_shows: shows,
          podcast_shows_search: search,
        })
      }
    >
      <>
        {loadError != null && shows.length > 0 && (
          <StaleDataNotice
            hasData
            what="the podcast shows"
            onRetry={() => void load()}
            className="mb-2"
          />
        )}
        {loadError != null && shows.length === 0 ? (
          <ReadFailure error={loadError} what="the podcast shows" onRetry={() => void load()} />
        ) : (
        <MatrxDataTable<PcShow>
          tableId="admin/podcasts/shows"
          data={shows}
          columns={[...(columns), { id: "custom-actions", header: "Actions", sortable: false, filter: false, customActions: (show) => (
            <div className="flex items-center gap-0.5">
              <PublicPageLink slug={show.slug} label={show.title} />
              <CopyLinkButton slug={show.slug} />
            </div>
          ) }]}
          rowActionDefs={rowActionDefs}
          selection={bulk.selection}
          getRowId={(show) => show.id}
          searchText={podcastShowSearchText}
          isLoading={isLoading}
          isFetching={isPending}
          density="condensed"
          detail={{ enabled: false }}
          pageSize={0}
          coverage={{ noun: "show", answeredBy: "client" }}
          onRowOpen={(show) =>
            startTransition(() =>
              pushAppHref(router, podcastShowAdminHref(show.id)),
            )
          }

          emptyState={{
            title: search
              ? "No shows match your search."
              : "No shows yet. Create one to get started.",
          }}
          toolbar={{
            title: "Shows",
            search: true,
            searchValue: search,
            onSearchChange: setSearch,
            searchPlaceholder: "Search shows…",
            refresh: { onRefresh: load, label: "Refresh" },
            add: {
              onAdd: () =>
                startTransition(() =>
                  pushAppHref(
                    router,
                    "/administration/knowledge/podcasts/shows/new",
                  ),
                ),
            },
          }}
        />
        )}
      </>
    </SurfaceRuntimeProvider>
  );
}
