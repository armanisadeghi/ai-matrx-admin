"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Plus, Search, Upload } from "lucide-react";

import {
  FileScopeBar,
  filterByScope,
  type FileScope,
} from "@/features/file-actions/FileScopeBar";
import { useFileItemActions } from "@/features/file-actions/useFileItemActions";
import { FileCardContextArea } from "@/features/file-actions/FileCardContextArea";
import { DOCUMENT_ADAPTER } from "@/features/file-actions/adapters";

import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { TapTargetButtonSolid } from "@ai-matrx/design-system/tap-target";
import { DocumentListCard } from "@/features/documents/components/DocumentListCard";
import { GoogleHomeStrip } from "@/features/google-workspace/linked/GoogleHomeStrip";
import { googleLinkIn } from "@/features/google-workspace/linked/link-store";
import {
  DOCUMENT_UPLOAD_ACCEPT,
  documentFileKind,
  importDocumentFile,
} from "@/features/documents/import-document-file";
import { DocumentsHubTable } from "@/features/documents/components/DocumentsHubTable";
import { DocumentsHubToolbar } from "@/features/documents/components/DocumentsHubToolbar";
import {
  createDocument,
  listAccessibleDocuments,
  listTrashedDocuments,
} from "@/features/documents/document-service";
import {
  isServiceFailure,
  type DocumentRow,
} from "@/features/data-tables/types";
import {
  documentMatchesQuery,
  sortDocuments,
  type DocumentSortKey,
} from "@/features/documents/utils/documentsHubDisplay";
import {
  buildDocumentsLibraryContextData,
  DOCUMENTS_SURFACE_NAME,
} from "@/features/documents/agent-context/buildDocumentsContextData";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { buildApplicationScopeFromMenuContext } from "@ai-matrx/context-menu/engine";
import { captureDomSelection } from "@ai-matrx/context-menu/engine";
import {
  useListViewPrefs,
  type LegacyListViewImport,
} from "@/lib/list-views/useListViewPrefs";
import type { ListViewPrefs } from "@/lib/redux/preferences/userPreferencesSlice";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useAppSelector } from "@/lib/redux/hooks";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";

/**
 * Style prefs for this hub (synced across devices via `userPreferences`).
 * Cards-first is this hub's own default — the platform default is table.
 */
const DOCUMENTS_HUB_VIEW_DEFAULTS: Partial<ListViewPrefs> = { view: "cards" };

/** One-time adoption of the device-local key this hub used before the hook. */
const DOCUMENTS_HUB_LEGACY_VIEW: LegacyListViewImport = {
  key: "documents-hub-view",
  map: (raw) => (raw === "table" || raw === "cards" ? { view: raw } : null),
};

export default function DocumentsLandingPage() {
  const router = useRouter();
  const organizationId = useAppSelector(selectOrganizationId);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<FileScope>("all");
  const [sortKey, setSortKey] = useState<DocumentSortKey>("updated");
  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { prefs, setView } = useListViewPrefs(
    "documents-hub",
    DOCUMENTS_HUB_VIEW_DEFAULTS,
    DOCUMENTS_HUB_LEGACY_VIEW,
  );
  // This hub renders two of the three canonical views; anything else is cards.
  const view = prefs.view === "table" ? "table" : "cards";

  const reload = useCallback(async () => {
    setLoading(true);
    const res =
      scope === "trash"
        ? await listTrashedDocuments()
        : await listAccessibleDocuments();
    if (isServiceFailure(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setDocuments(res.data);
    setError(null);
    setLoading(false);
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    let capturedOrganizationId: string;
    try {
      capturedOrganizationId = await ensureOrgId(organizationId);
    } catch (error) {
      setCreating(false);
      toast({
          title: "Could not create document",
          description:
            error instanceof Error
              ? error.message
              : "Select an organization before creating a document.",
          variant: "destructive",
        });
      return;
    }
    const res = await createDocument({
      name: "Untitled document",
      organizationId: capturedOrganizationId,
    });
    setCreating(false);
    if (isServiceFailure(res)) {
      toast({
        title: "Could not create document",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    router.push(`/documents/${res.data.id}`);
  }, [organizationId, router]);

  const handleUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!documentFileKind(file.name)) {
      toast({
        title: "Can't import that file",
        description: "Use Word (.docx), Markdown, text or HTML.",
        variant: "destructive",
      });
      return;
    }
    setUploading(true);
    try {
      const orgId = await ensureOrgId(organizationId);
      const made = await importDocumentFile(file, orgId);
      router.push(`/documents/${made.id}`);
    } catch (err) {
      toast({
        title: "Import failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const { userId, starredIds, menuFor, sectionsFor, dialogs } = useFileItemActions(
    DOCUMENT_ADAPTER,
    reload,
  );

  const isAnyNavigating = navigatingId != null || isPending;

  const handleNavigate = useCallback(
    (id: string, path: string) => {
      if (isAnyNavigating) return;
      setNavigatingId(id);
      startTransition(() => {
        router.push(path);
      });
    },
    [isAnyNavigating, router],
  );

  const filteredDocuments = useMemo(() => {
    const scoped = filterByScope(documents, scope, userId, starredIds);
    const filtered = scoped.filter((doc) => documentMatchesQuery(doc, query));
    return sortDocuments(filtered, sortKey);
  }, [documents, scope, userId, starredIds, query, sortKey]);

  const isSearching = query.trim().length > 0;
  const totalVisible = filteredDocuments.length;
  const showToolbar = !loading && !error && (documents.length > 0 || scope !== "all");

  // ---- Agent-context surface (matrx-user/documents, library view) ---------
  // Plain function (React Compiler memoizes; never useCallback) so it reads
  // the live list state at Run time rather than a stale closure.
  //
  // This mount registers NO write handlers, on purpose. The surface HAS
  // agent-writable targets, but both of them address a single open document,
  // and a write target carries one value with no entity selector — on a roster
  // of N documents "set the description" has no subject. The only mutations
  // this route offers are create (a creation action, not a field write),
  // import (needs a `File` an agent cannot supply) and delete (destructive,
  // human-only), so read-only is the correct posture here rather than an
  // oversight. `listAgentWritableTargets()` offers a target only where its
  // mount registered a handler, so the document route's targets stay invisible
  // from the library. See the `writeTargets` doc block in
  // features/surfaces/manifests/documents.manifest.ts.
  const getLibraryScope = () => {
    const captured = captureDomSelection();
    return buildApplicationScopeFromMenuContext({
      selectedText: captured.text,
      selectionRange: null,
      contextData: buildDocumentsLibraryContextData({
        documents,
        visibleDocuments: filteredDocuments,
        searchQuery: query,
        sortKey,
        viewMode: view,
        loading,
        error,
      }),
    });
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName={DOCUMENTS_SURFACE_NAME}
      getScope={getLibraryScope}
      isEditable={false}
    >
      <RouteHeader
        left={
          <span className="px-1.5 text-sm font-medium text-foreground">
            Documents
          </span>
        }
        right={
          <>
          <input
            ref={uploadRef}
            type="file"
            accept={DOCUMENT_UPLOAD_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              void handleUpload(file);
            }}
          />
          <TapTargetButtonSolid
            icon={
              uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )
            }
            label="Upload a file"
            onClick={() => uploadRef.current?.click()}
            disabled={uploading}
          />
          <TapTargetButtonSolid
            icon={
              creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )
            }
            label="New document"
            onClick={handleCreate}
            disabled={creating}
          />
          </>
        }
      />
      <div className="h-full overflow-y-auto scrollbar-none">
        {/* The search/sort toolbar is the first thing in the scroll area, so
            the content takes header clearance — otherwise it sits under the
            glass header and collides with the title and the New button. */}
        <div className="w-full space-y-4 p-1.5 pt-[var(--shell-header-h)]">
          <GoogleHomeStrip
            kind="document"
            linked={documents.flatMap((doc) => {
              const link = googleLinkIn(doc.metadata);
              return link ? [{ id: doc.id, name: doc.document_name, link }] : [];
            })}
            unlinked={documents
              .filter((doc) => !googleLinkIn(doc.metadata) && doc.user_id === userId)
              .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
              .map((doc) => ({ id: doc.id, name: doc.document_name, updatedAt: doc.updated_at }))}
            hidden={scope === "trash"}
            onImported={(id) => router.push(`/documents/${id}`)}
            onChanged={() => void reload()}
          />
          {!error && showToolbar ? (
            <>
              <DocumentsHubToolbar
                query={query}
                onQueryChange={setQuery}
                view={view}
                onViewChange={setView}
                sortKey={sortKey}
                onSortChange={setSortKey}
                hideSearch={view === "table"}
              />
              <FileScopeBar scope={scope} onChange={setScope} />
              {dialogs}

              {isSearching ? (
                <p className="px-1 text-[11px] tabular-nums text-muted-foreground">
                  {totalVisible === documents.length
                    ? `${totalVisible} documents`
                    : `${totalVisible} of ${documents.length} documents`}
                </p>
              ) : null}
            </>
          ) : null}

          {loading && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {error && !loading && (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">
                {error}
                <ErrorAlchemyMenu error={error} />
              </CardContent>
            </Card>
          )}

          {!loading && !error && documents.length === 0 && scope !== "all" && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {scope === "trash" ? "Trash is empty." : "Nothing here."}
            </div>
          )}

          {!loading && !error && documents.length === 0 && scope === "all" && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                <FileText className="size-8" />
                <div className="text-sm">No documents yet.</div>
                <div className="text-xs">
                  Tap <span className="font-medium">New document</span> to
                  create one.
                </div>
              </CardContent>
            </Card>
          )}

          {!loading &&
          !error &&
          documents.length > 0 &&
          isSearching &&
          totalVisible === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm">Nothing matches your search.</p>
            </div>
          ) : null}

          {!loading &&
          !error &&
          documents.length > 0 &&
          !isSearching &&
          totalVisible === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nothing here.
            </div>
          ) : null}

          {!loading && !error && documents.length > 0 && totalVisible > 0 ? (
            view === "table" ? (
              <DocumentsHubTable
                documents={filteredDocuments}
                menuFor={(doc) => menuFor(doc, scope === "trash")}
                sectionsFor={(payload) => sectionsFor(payload, scope === "trash")}
              />
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDocuments.map((doc) => (
                  <FileCardContextArea
                    key={doc.id}
                    className="grid min-w-0"
                    menu={(control) => menuFor(doc, scope === "trash", control)}
                  >
                    {(menu) => (
                      <DocumentListCard
                        doc={doc}
                        isNavigating={navigatingId === doc.id}
                        isAnyNavigating={isAnyNavigating}
                        onNavigate={handleNavigate}
                        menu={menu}
                        starred={starredIds.has(doc.id)}
                        shared={userId !== null && doc.user_id !== userId}
                      />
                    )}
                  </FileCardContextArea>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>
    </SurfaceRuntimeProvider>
  );
}
