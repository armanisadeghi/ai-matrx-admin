"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis, Loader2, Table2, Upload } from "lucide-react";

import { toast } from "@/components/ui/use-toast";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { TapTargetButton } from "@ai-matrx/design-system/tap-target";
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetBody,
} from "@ai-matrx/design-system";
import { EntityDoorControls } from "@/components/official/entity-ref/EntityDoorControls";

import {
  createWorkbook,
  listAccessibleWorkbooks,
  listTrashedWorkbooks,
  workbookSourceLabel,
} from "@/features/workbooks/workbook-service";
import type { FileScope } from "@/features/file-actions/FileScopeBar";
import { WORKBOOK_ADAPTER } from "@/features/file-actions/adapters";
import { FileHome } from "@/features/file-actions/home/FileHome";
import { WORKBOOK_HOME } from "@/features/file-actions/home/home-kinds";
import { BlankTile, StartBand, StartTile } from "@/features/file-actions/home/StartBand";
import { useHomeTemplates } from "@/features/templates/files/components/HomeTemplates";
import { FromTableTile } from "@/features/workbooks/components/FromTableTile";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { isServiceFailure, type Workbook } from "@/features/data-tables/types";
// xlsx-to-univer (xlsx + @univerjs/*) and smart-importer (xlsx) are heavy —
// this is a LIST page that renders no spreadsheet. Both load via
// await import() inside the async upload handlers (code-splitting skill,
// rule 6); only their types stay static.
import type {
  ImportRouteDetection,
  ImportRouting,
} from "@/features/data-tables/smart-importer";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createWorkbooksScope } from "@/features/surfaces/manifests/workbooks.manifest";
import { ImportRouteDialog } from "@/features/data-tables/components/ImportRouteDialog";
import { openOverlay } from "@/lib/redux/slices/overlaySlice";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { AGENT_ICON } from "@/components/icons/domain-icons";
import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { importWorkbookFile, unsupportedFileReason } from "@/features/workbooks/import-workbook-file";
import { GoogleHomeStrip } from "@/features/google-workspace/linked/GoogleHomeStrip";
import { googleLinkIn } from "@/features/google-workspace/linked/link-store";
import { GoogleSheetsMark } from "@/features/google-workspace/linked/marks";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";

export default function WorkbooksLandingPage() {
  const homeTemplates = useHomeTemplates("workbook");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const organizationId = useAppSelector(selectOrganizationId);
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<FileScope>("all");
  const userId = useAppSelector(selectUserId);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Smart-import state: separate file picker pointed at the same accept set
  // but funnels through detectImportRoute() before committing.
  const smartFileInputRef = useRef<HTMLInputElement | null>(null);
  const [smartDetection, setSmartDetection] =
    useState<ImportRouteDetection | null>(null);
  const [smartFile, setSmartFile] = useState<File | null>(null);
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);
  const [smartCommitting, setSmartCommitting] = useState(false);
  // Mobile-only "more" sheet holding Smart import + Import — the icon row
  // collides with the shell avatar below `sm`, see core-route-headers skill.
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const res =
      scope === "trash"
        ? await listTrashedWorkbooks()
        : await listAccessibleWorkbooks();
    if (isServiceFailure(res)) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setWorkbooks(res.data);
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
          title: "Could not create workbook",
          description:
            error instanceof Error
              ? error.message
              : "Select an organization before creating a workbook.",
          variant: "destructive",
        });
      return;
    }
    const res = await createWorkbook({
      name: "Untitled workbook",
      organizationId: capturedOrganizationId,
    });
    if (isServiceFailure(res)) {
      setCreating(false);
      toast({
        title: "Could not create workbook",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    // The tile stays busy until the editor opens (the route can take seconds to compile): a second
    // press while it loads would make a second record.
    router.push(`/workbooks/${res.data.id}`);
  }, [organizationId, router]);

  const handleImportXlsx = useCallback(
    async (file: File) => {
      // The file input has no `accept` filter (so Drive / Google Sheets
      // pickers don't grey everything out) — validate here. Drive's
      // ".gsheet" shortcuts and Google-only mime types can't be parsed
      // client-side: give a clear, actionable error instead of a stack
      // trace from SheetJS.
      const reason = unsupportedFileReason(file);
      if (reason) {
        toast({
          title: "Can't import that file",
          description: reason,
          variant: "destructive",
        });
        return;
      }
      setImporting(true);
      let selectionCancelled = false;
      try {
        const imported = await importWorkbookFile(file, organizationId);
        toast({
          title: "Workbook imported",
          description: imported.notCarried.length
            ? `${imported.name}. Not carried: ${imported.notCarried.join("; ")}`
            : imported.name,
          variant: "success",
        });
        router.push(`/workbooks/${imported.id}`);
      } catch (err) {
        selectionCancelled = false;
        if (!selectionCancelled) {
          toast({
            title: "Could not import workbook",
            description: err instanceof Error ? err.message : String(err),
            variant: "destructive",
          });
        }
      } finally {
        setImporting(false);
        // Cancelling the organization picker leaves the chosen file intact so
        // the user can resume this exact import after selecting an org.
        if (!selectionCancelled && fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [organizationId, router],
  );

  const handleSmartImport = useCallback(async (file: File) => {
    // Reset the input so picking the same file again still fires onChange.
    if (smartFileInputRef.current) smartFileInputRef.current.value = "";
    setSmartCommitting(false);

    const reason = unsupportedFileReason(file);
    if (reason) {
      toast({
        title: "Can't analyze that file",
        description: reason,
        variant: "destructive",
      });
      return;
    }

    try {
      const { detectImportRoute } =
        await import("@/features/data-tables/smart-importer");
      const detection = await detectImportRoute(file);
      setSmartFile(file);
      setSmartDetection(detection);
      setSmartDialogOpen(true);
    } catch (err) {
      toast({
        title: "Could not analyze file",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  }, []);

  const handleSmartCommit = useCallback(
    async (routing: ImportRouting) => {
      if (!smartFile) return;
      setSmartCommitting(true);
      try {
        if (routing === "workbook") {
          setSmartDialogOpen(false);
          await handleImportXlsx(smartFile);
        } else {
          // Typed-table routing: the ONE "Save to a table" reads the file's first sheet and makes the
          // table in the record store (or adds the rows to one the person already has).
          const { readImportGrid } = await import("@/features/data-tables/smart-importer");
          const [headers = [], ...rows] = await readImportGrid(smartFile);
          setSmartDialogOpen(false);
          dispatch(
            openOverlay({
              overlayId: "saveToTable",
              instanceId: `save-to-table-${Date.now()}`,
              data: {
                text: null,
                value: null,
                hasValue: false,
                grid: { headers, rows },
                title: smartFile.name.replace(/\.[^.]+$/, ""),
                shapeIndex: 0,
                // object-org-exempt: a NEW table has no organization of its own yet; it is made where the person is working
                organizationId: organizationId ?? null,
                callbackGroupId: null,
              },
            }),
          );
        }
      } finally {
        setSmartCommitting(false);
        setSmartFile(null);
        setSmartDetection(null);
      }
    },
    [smartFile, dispatch, organizationId],
  );

  // Surface emitter for `matrx-user/workbooks` on the library route. Built at
  // trigger time from live state; the open-workbook / sheet / editor values
  // belong to /workbooks/[id] and are deliberately absent here.
  //
  // This mount registers NO write handlers, on purpose. The surface HAS
  // agent-writable targets, but every one of them addresses a single open
  // workbook, and a write target carries one value with no entity selector —
  // on a roster of N workbooks "set the description" has no subject. The only
  // mutations this route offers are create (a creation action, not a field
  // write), import (needs a `File` an agent cannot supply) and delete
  // (destructive, human-only), so read-only is the correct posture here rather
  // than an oversight. `listAgentWritableTargets()` offers a target only where
  // its mount registered a handler, so the editor route's targets stay
  // invisible from the library. See the `writeTargets` doc block in
  // features/surfaces/manifests/workbooks.manifest.ts.
  const getScope = () =>
    createWorkbooksScope({
      workbooks_load_status: { loading, error },
      ...(loading || error
        ? {}
        : {
            workbooks_count: workbooks.length,
            workbooks_summary: workbooks.map((wb) => ({
              id: wb.id,
              name: wb.workbook_name,
              description: wb.description,
              source: wb.source,
              is_public: wb.is_public,
              version: wb.version,
              updated_at: wb.updated_at,
            })),
          }),
      ...(creating || importing || smartCommitting || smartDialogOpen
        ? {
            workbook_import_state: {
              creating,
              importing,
              smart_dialog_open: smartDialogOpen,
              smart_file_name: smartFile?.name ?? null,
              detection: smartDetection,
            },
          }
        : {}),
    });

  const busy = importing || creating || smartCommitting;

  return (
    <>
      {/*
        No `accept` filter — Drive / Google Sheets shortcuts and many
        mobile pickers grey out everything when an accept whitelist is
        set. We validate by extension/parse after the user picks so the
        error message is friendly + actionable.
      */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleImportXlsx(f);
        }}
      />
      <input
        ref={smartFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSmartImport(f);
        }}
      />
      <FileHome<Workbook>
        kind={WORKBOOK_HOME}
        adapter={WORKBOOK_ADAPTER}
        rows={workbooks}
        toItem={(wb) => ({
          row: wb,
          id: wb.id,
          name: wb.workbook_name,
          description: wb.description,
          ownerId: wb.user_id,
          createdAt: wb.created_at,
          updatedAt: wb.updated_at,
          updatedBy: wb.updated_by,
          sourceLabel: workbookSourceLabel(wb.source),
        })}
        loading={loading}
        error={error}
        scope={scope}
        onScopeChange={setScope}
        reload={reload}
        viewPrefsKey="workbooks-hub"
        onPickFile={() => fileInputRef.current?.click()}
        pickingFile={importing}
        marksFor={(wb, where) => <WorkbookMarks workbook={wb} withSourceFile={where === "table"} />}
        wrap={(_list, home) => (
          <SurfaceRuntimeProvider surfaceName="matrx-user/workbooks" getScope={getScope}>
            {home}
          </SurfaceRuntimeProvider>
        )}
        header={
          <RouteHeader
            left={<span className="px-1.5 text-sm font-medium text-foreground">Workbooks</span>}
            right={
              <div className="flex items-center">
                {/* Desktop: the import doors. Mobile: one "More" sheet — the icons collided with
                    the shell avatar at 375px. New lives in the Start band (Blank). */}
                <div className="hidden items-center sm:flex">
                  <TapTargetButton
                    icon={<AGENT_ICON className="h-4 w-4" />}
                    ariaLabel="Smart import"
                    tooltip="Auto-detect whether your file is a typed dataset or a workbook"
                    disabled={busy}
                    onClick={() => smartFileInputRef.current?.click()}
                  />
                  <TapTargetButton
                    icon={importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    ariaLabel="Import XLSX / CSV"
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  />
                </div>
                <div className="shrink-0 sm:hidden">
                  <TapTargetButton
                    icon={<Ellipsis className="h-4 w-4" />}
                    ariaLabel="More import options"
                    disabled={busy}
                    onClick={() => setMobileActionsOpen(true)}
                  />
                </div>
              </div>
            }
          />
        }
        startBand={
          <StartBand
            kind={WORKBOOK_HOME}
            blank={<BlankTile onCreate={() => void handleCreate()} creating={creating} />}
            {...homeTemplates}
            extraTiles={
              <>
                <FromTableTile />
                <StartTile
                  label="Import a file"
                  title="Import an Excel or CSV file"
                  busy={importing}
                  disabled={busy}
                  onClick={() => fileInputRef.current?.click()}
                  face={<Upload className="size-10 stroke-[1.25] text-success" aria-hidden />}
                />
              </>
            }
          />
        }
        googleStrip={
          <GoogleHomeStrip
            kind="workbook"
            linked={workbooks.flatMap((wb) => {
              const link = googleLinkIn(wb.metadata);
              return link ? [{ id: wb.id, name: wb.workbook_name, link }] : [];
            })}
            unlinked={workbooks
              .filter((wb) => !googleLinkIn(wb.metadata) && wb.user_id === userId)
              .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
              .map((wb) => ({ id: wb.id, name: wb.workbook_name, updatedAt: wb.updated_at }))}
            hidden={scope === "trash"}
            onImported={(id) => router.push(`/workbooks/${id}`)}
            onChanged={() => void reload()}
          />
        }
      />
      <BottomSheet open={mobileActionsOpen} onOpenChange={setMobileActionsOpen} title="Import workbook">
        <BottomSheetHeader title="Import" />
        <BottomSheetBody>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-5 min-h-[52px] border-b border-glass-edge active:bg-glass-active transition-colors disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setMobileActionsOpen(false);
              smartFileInputRef.current?.click();
            }}
          >
            <AGENT_ICON className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="text-left">
              <div className="text-[15px]">Smart import</div>
              <div className="text-xs text-muted-foreground">
                Auto-detect whether your file is a typed dataset or a workbook
              </div>
            </div>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 px-5 min-h-[52px] active:bg-glass-active transition-colors disabled:opacity-50"
            disabled={busy}
            onClick={() => {
              setMobileActionsOpen(false);
              fileInputRef.current?.click();
            }}
          >
            <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-[15px]">Import XLSX / CSV</span>
          </button>
        </BottomSheetBody>
      </BottomSheet>
      <ImportRouteDialog
        isOpen={smartDialogOpen}
        onClose={() => {
          if (!smartCommitting) {
            setSmartDialogOpen(false);
            setSmartFile(null);
            setSmartDetection(null);
          }
        }}
        detection={smartDetection}
        fileName={smartFile?.name ?? ""}
        onCommit={handleSmartCommit}
        isCommitting={smartCommitting}
      />
    </>
  );
}

/** A card's small marks: the Google file it is linked to, the table it is linked to, the file it came from. */
function WorkbookMarks({ workbook: wb, withSourceFile }: { workbook: Workbook; withSourceFile: boolean }) {
  const google = googleLinkIn(wb.metadata)?.webViewLink;
  const tableLinks = (wb.metadata as { table_links?: Array<{ table_id?: unknown }> } | null)?.table_links;
  const tableId = Array.isArray(tableLinks) ? tableLinks.find((l) => typeof l?.table_id === "string")?.table_id : undefined;
  return (
    <>
      {google ? (
        <OutboundLink
          href={google}
          className="inline-flex shrink-0 items-center"
          title="Open in Google Sheets"
          aria-label="Open in Google Sheets"
        >
          <GoogleSheetsMark className="size-3.5" />
        </OutboundLink>
      ) : null}
      {typeof tableId === "string" ? (
        <Link
          href={`/data/${tableId}`}
          className="inline-flex shrink-0 items-center text-muted-foreground hover:text-foreground"
          title="Open the linked table"
          aria-label="Open the linked table"
        >
          <Table2 className="size-3.5" />
        </Link>
      ) : null}
      {withSourceFile && wb.original_file_id ? (
        <EntityDoorControls
          token="file"
          id={wb.original_file_id}
          name={`the file ${wb.workbook_name} was imported from`}
          showOpen
          disableNewTab
          size="sm"
        />
      ) : null}
    </>
  );
}
