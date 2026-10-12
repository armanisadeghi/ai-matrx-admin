"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import type { FileScope } from "@/features/file-actions/FileScopeBar";
import { DOCUMENT_ADAPTER } from "@/features/file-actions/adapters";
import { FileHome } from "@/features/file-actions/home/FileHome";
import { DOCUMENT_HOME } from "@/features/file-actions/home/home-kinds";
import { BlankTile, StartBand, StartTile } from "@/features/file-actions/home/StartBand";
import { useHomeTemplates } from "@/features/templates/files/components/HomeTemplates";

import { toast } from "@/components/ui/use-toast";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { TapTargetButton } from "@ai-matrx/design-system/tap-target";
import { GoogleHomeStrip } from "@/features/google-workspace/linked/GoogleHomeStrip";
import { googleLinkIn } from "@/features/google-workspace/linked/link-store";
import { GoogleDocsMark } from "@/features/google-workspace/linked/marks";
import {
  DOCUMENT_UPLOAD_ACCEPT,
  documentFileKind,
  importDocumentFile,
} from "@/features/documents/import-document-file";
import {
  createDocument,
  listAccessibleDocuments,
  listTrashedDocuments,
} from "@/features/documents/document-service";
import { isServiceFailure, type DocumentRow } from "@/features/data-tables/types";
import { documentSourceLabel } from "@/features/documents/utils/documentsHubDisplay";
import {
  buildDocumentsLibraryContextData,
  DOCUMENTS_SURFACE_NAME,
} from "@/features/documents/agent-context/buildDocumentsContextData";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { buildApplicationScopeFromMenuContext } from "@ai-matrx/context-menu/engine";
import { captureDomSelection } from "@ai-matrx/context-menu/engine";
import type { LegacyListViewImport } from "@/lib/list-views/useListViewPrefs";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useAppSelector } from "@/lib/redux/hooks";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

/** One-time adoption of the device-local key this hub used before the list-view hook. */
const DOCUMENTS_HUB_LEGACY_VIEW: LegacyListViewImport = {
  key: "documents-hub-view",
  map: (raw) => (raw === "table" || raw === "cards" ? { view: raw } : null),
};

/**
 * `/documents` — Google Docs' home, on the shared `FileHome` (the Workbooks home is the same
 * component set). This page keeps what is its own: load, create, upload, the Google strip's data,
 * and the `matrx-user/documents` library surface.
 */
export default function DocumentsLandingPage() {
  const homeTemplates = useHomeTemplates("document");
  const router = useRouter();
  const organizationId = useAppSelector(selectOrganizationId);
  const userId = useAppSelector(selectUserId);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [scope, setScope] = useState<FileScope>("all");

  const reload = useCallback(async () => {
    setLoading(true);
    const res = scope === "trash" ? await listTrashedDocuments() : await listAccessibleDocuments();
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

  const handleCreate = async () => {
    setCreating(true);
    let capturedOrganizationId: string;
    try {
      capturedOrganizationId = await ensureOrgId(organizationId);
    } catch (err) {
      setCreating(false);
      toast({
        title: "Could not create document",
        description: err instanceof Error ? err.message : "Select an organization before creating a document.",
        variant: "destructive",
      });
      return;
    }
    const res = await createDocument({ name: "Untitled document", organizationId: capturedOrganizationId });
    if (isServiceFailure(res)) {
      setCreating(false);
      toast({ title: "Could not create document", description: res.error, variant: "destructive" });
      return;
    }
    // The tile stays busy until the editor opens (the route can take seconds to compile): a second
    // press while it loads would make a second record.
    router.push(`/documents/${res.data.id}`);
  };

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

  // ---- Agent-context surface (matrx-user/documents, library view) ---------
  // Built at Run time from the live list (plain function; the React Compiler memoizes).
  //
  // This mount registers NO write handlers, on purpose: both of the surface's write targets address
  // ONE open document, and a write target carries one value with no entity selector — on a roster
  // of N documents "set the description" has no subject. Create is a creation action, import needs
  // a `File` an agent cannot supply, delete is human-only. See the `writeTargets` doc block in
  // features/surfaces/manifests/documents.manifest.ts.
  const libraryScope =
    (list: { visible: DocumentRow[]; query: string; sort: Parameters<typeof buildDocumentsLibraryContextData>[0]["sortKey"]; view: string }) =>
    () => {
      const captured = captureDomSelection();
      return buildApplicationScopeFromMenuContext({
        selectedText: captured.text,
        selectionRange: null,
        contextData: buildDocumentsLibraryContextData({
          documents,
          visibleDocuments: list.visible,
          searchQuery: list.query,
          sortKey: list.sort,
          viewMode: list.view,
          loading,
          error,
        }),
      });
    };

  const pickFile = () => uploadRef.current?.click();

  return (
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
      <FileHome<DocumentRow>
        kind={DOCUMENT_HOME}
        adapter={DOCUMENT_ADAPTER}
        rows={documents}
        toItem={(doc) => ({
          row: doc,
          id: doc.id,
          name: doc.document_name,
          description: doc.description,
          ownerId: doc.user_id,
          createdAt: doc.created_at,
          updatedAt: doc.updated_at,
          updatedBy: doc.updated_by,
          sourceLabel: documentSourceLabel(doc.source),
        })}
        loading={loading}
        error={error}
        scope={scope}
        onScopeChange={setScope}
        reload={reload}
        viewPrefsKey="documents-hub"
        legacyViewPrefs={DOCUMENTS_HUB_LEGACY_VIEW}
        onPickFile={pickFile}
        pickingFile={uploading}
        marksFor={(doc) => {
          const link = googleLinkIn(doc.metadata)?.webViewLink;
          return link ? (
            <OutboundLink
              href={link}
              className="inline-flex shrink-0 items-center"
              title="Open in Google Docs"
              aria-label="Open in Google Docs"
            >
              <GoogleDocsMark className="size-3.5" />
            </OutboundLink>
          ) : null;
        }}
        wrap={(list, home) => (
          <SurfaceRuntimeProvider surfaceName={DOCUMENTS_SURFACE_NAME} getScope={libraryScope(list)} isEditable={false}>
            {home}
          </SurfaceRuntimeProvider>
        )}
        header={
          <RouteHeader
            left={<span className="px-1.5 text-sm font-medium text-foreground">Documents</span>}
            right={
              <TapTargetButton
                icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                ariaLabel="Upload a file"
                tooltip="Upload a Word, Markdown, text or HTML file"
                onClick={pickFile}
                disabled={uploading}
              />
            }
          />
        }
        startBand={
          <StartBand
            kind={DOCUMENT_HOME}
            blank={<BlankTile onCreate={() => void handleCreate()} creating={creating} />}
            {...homeTemplates}
            extraTiles={
              <StartTile
                label="Upload a file"
                title="Upload a Word, Markdown, text or HTML file"
                busy={uploading}
                onClick={pickFile}
                face={<Upload className="size-10 stroke-[1.25] text-info" aria-hidden />}
              />
            }
          />
        }
        googleStrip={
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
        }
      />
    </>
  );
}
