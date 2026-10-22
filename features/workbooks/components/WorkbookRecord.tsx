"use client";

/**
 * WorkbookRecord — ONE workbook, whole: the Univer editor with its header, the `matrx-user/workbooks`
 * agent surface for it and its rename / description write targets. `/workbooks/[id]` renders it as the
 * page; a board tile renders the same component with `embedded` (no shell header, no back route, the
 * shell stays as it is). One component, two consumers.
 */

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { useStoreRead } from "@/lib/redux/store-reads/useStoreRead";
import { supabase } from "@/utils/supabase/client";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { ShareButton } from "@/features/sharing/components/ShareButton";
import { EditorTitleField } from "@/components/editor-chrome/EditorTitleField";
import { FileTitleMarks } from "@/features/file-actions/FileTitleMarks";
import { WORKBOOK_ADAPTER } from "@/features/file-actions/adapters";
import { useLiveFileName } from "@/features/file-actions/useLiveFileName";
import { AccessGate } from "@ai-matrx/sharing/access/react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";

import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { createWorkbooksScope } from "@/features/surfaces/manifests/workbooks.manifest";
import { readWorkbookScopeSource } from "@ai-matrx/office/sheets";
import {
  getWorkbook,
  renameWorkbook,
  updateWorkbookDescription,
} from "@ai-matrx/office/sheets";
import { isServiceFailure } from "@/features/data-tables/types";
import { type Workbook } from "@ai-matrx/office/core";
import { canActOn } from "@/features/access-gate/service/canActOn";

interface OpenWorkbook {
  workbook: Workbook;
  userId: string | null;
  canEdit: boolean;
}

// Univer hard-depends on `window` / `document`. Mount client-only.
const WorkbookEditor = dynamic(
  () => import("@/features/workbooks/components/WorkbookEditor"),
  { ssr: false, loading: () => <EditorBootSpinner /> },
);

function EditorBootSpinner() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Loader2 className="size-4 animate-spin mr-2" />
      Loading editor…
    </div>
  );
}

export function WorkbookRecord({
  id,
  embedded = false,
  onName,
}: {
  id: string;
  /** In a board tile: no shell header, no back route, the shell chrome is left alone. */
  embedded?: boolean;
  /** The workbook's current name (renamed here, by an agent or by a collaborator). */
  onName?: (name: string) => void;
}) {
  // The workbook, who is looking and whether they may edit: read ONCE per workbook per tab and kept
  // (a tile waking from sleep or remounting shows the kept answer and reads nothing). A failed read
  // is never kept, so the next mount asks again.
  // Editability must be RESOLVED before the editor mounts. Univer boots once
  // per workbookId; if `editable` flips false→true after mount, the boot
  // effect tears down and recreates Univer, and disposing it mid-render
  // crashes Univer's React popups — content loads, then vanishes. Gate the
  // mount on the answer so `editable` is stable from the first frame.
  const open = useStoreRead<OpenWorkbook>(`workbook.open:${id}`, async () => {
    const res = await getWorkbook(id);
    if (isServiceFailure(res)) throw new Error(res.error);
    const { data: userData } = await getClaimsUser(supabase);
    const userId = userData?.user?.id ?? null;
    // Editor gate: owner ALWAYS edits; non-owner edits when the access kernel
    // (canActOn → iam.has_access) allows editor — the same question the write doors ask. has_permission is the source of truth
    // for sharing, so the UI matches what the RLS-protected RPCs will accept.
    const canEdit = userId && userId === res.data.user_id ? true : await canActOn("workbook", id, "editor");
    return { workbook: res.data, userId, canEdit };
  });
  const error = open.error;
  const workbook = open.data?.workbook ?? null;
  const currentUserId = open.data?.userId ?? null;
  const canEdit = open.data?.canEdit ?? false;
  const permsResolved = open.hasData;
  const setWorkbook = (next: Workbook | ((w: Workbook | null) => Workbook | null)) =>
    open.setData((prev) => {
      if (!prev) return prev as unknown as OpenWorkbook;
      const value = typeof next === "function" ? next(prev.workbook) : next;
      return value ? { ...prev, workbook: value } : prev;
    });

  const currentName = workbook?.workbook_name ?? null;
  useEffect(() => {
    if (currentName) onName?.(currentName);
  }, [currentName, onName]);

  const isOwner =
    workbook !== null &&
    currentUserId !== null &&
    workbook.user_id === currentUserId;

  // The ONE rename path. The header field's blur/Enter commit and the
  // `workbook_name` write target both land here, so an agent-originated
  // rename is indistinguishable from the user typing it — same service call,
  // same optimistic state, same revert on failure.
  const applyRename = async (name: string) => {
    if (!workbook || name === workbook.workbook_name) return;
    const res = await renameWorkbook(id, name);
    if (isServiceFailure(res)) throw new Error(res.error);
    setWorkbook(res.data);
  };

  // A collaborator's (or an agent's) rename shows here live, like Google's title.
  useLiveFileName({ table: "udt_workbooks", column: "workbook_name", id }, (name) =>
    setWorkbook((w) => (w && w.workbook_name !== name ? { ...w, workbook_name: name } : w)),
  );

  // Write half of `matrx-user/workbooks` for the EDITOR route. Only the two
  // human-authored fields of the workbook row are wired here; the sheet-name
  // target belongs to `WorkbookEditor`, which owns the Univer instance, and
  // the library route registers nothing at all (see the manifest's
  // `writeTargets` doc block for the per-mount rationale). Both persist
  // immediately through `workbook-service` — never a direct table write — and
  // both validate then THROW on a bad shape, which the writeback seam turns
  // into an error envelope the agent reads. Fresh closures per call
  // (getWriteHandlers contract).
  const getSurfaceWriteHandlers = () => ({
    workbook_name: async (value: unknown) => {
      if (
        typeof value !== "string" ||
        !value.trim() ||
        value.trim().length > 200
      )
        throw new Error(
          "workbook_name expects a non-empty string of at most 200 characters.",
        );
      if (!workbook)
        throw new Error("The workbook has not finished loading yet.");
      if (!canEdit)
        throw new Error(
          "This workbook is open in viewer-only mode — the user does not have edit permission, so it cannot be renamed.",
        );
      await applyRename(value.trim());
    },
    workbook_description: async (value: unknown) => {
      if (typeof value !== "string" || value.length > 2000)
        throw new Error(
          "workbook_description expects a string of at most 2000 characters.",
        );
      if (!workbook)
        throw new Error("The workbook has not finished loading yet.");
      if (!canEdit)
        throw new Error(
          "This workbook is open in viewer-only mode — the user does not have edit permission, so its description cannot be changed.",
        );
      const res = await updateWorkbookDescription(id, value);
      if (isServiceFailure(res)) throw new Error(res.error);
      setWorkbook(res.data);
    },
  });

  if (error) {
    return (
      <>
        {embedded ? null : (
          <RouteHeader
            left={<ChevronLeftTapButton href="/workbooks" ariaLabel="Back" />}
          />
        )}
        {/* The service reports only a message (no PostgREST code), so the
            gate asks the platform which state this is — denied, deleted,
            missing, or signed out — rather than guessing from the text. */}
        <div className={embedded ? "h-full overflow-hidden" : "h-full overflow-hidden pt-[var(--shell-header-h)]"}>
          <AccessGate
            token="workbook"
            id={id}
            fallbackHref="/workbooks"
            fallbackLabel="Back to workbooks"
          />
        </div>
      </>
    );
  }

  // Surface emitter for `matrx-user/workbooks` on the editor route. Identity
  // and permissions come from this page's state; sheets, snapshot, save
  // status and collab presence are read at trigger time from the mounted
  // editor via the scope source (null until Univer has booted, in which case
  // those keys are simply omitted).
  const getScope = () => {
    const live = readWorkbookScopeSource(id);
    return createWorkbooksScope({
      workbook_id: id,
      ...(workbook
        ? {
            workbook_name: workbook.workbook_name,
            ...(workbook.description
              ? { workbook_description: workbook.description }
              : {}),
            workbook_source: workbook.source,
            workbook_updated_at: workbook.updated_at,
            workbook_permissions: {
              is_owner: isOwner,
              can_edit: canEdit,
              is_public: workbook.visibility === "public",
            },
            open_workbook: {
              id: workbook.id,
              name: workbook.workbook_name,
              description: workbook.description,
              source: workbook.source,
              version: workbook.version,
              is_public: workbook.visibility === "public",
              original_file_id: workbook.original_file_id,
              created_at: workbook.created_at,
              updated_at: workbook.updated_at,
            },
          }
        : {}),
      ...(live
        ? {
            workbook_sheets: live.sheets,
            ...(live.activeSheetId
              ? { active_sheet_id: live.activeSheetId }
              : {}),
            ...(live.activeSheetName
              ? { active_sheet_name: live.activeSheetName }
              : {}),
            ...(live.snapshot ? { workbook_snapshot: live.snapshot } : {}),
            workbook_editor_status: {
              boot_state: live.bootState,
              load_error: live.loadError,
            },
            workbook_save_status: live.saveStatus,
            workbook_collab: live.collab,
          }
        : {}),
    });
  };

  return (
    <SurfaceRuntimeProvider
      surfaceName="matrx-user/workbooks"
      isEditable={canEdit}
      getScope={getScope}
      getWriteHandlers={getSurfaceWriteHandlers}
    >
      {permsResolved && workbook ? (
        <WorkbookEditor
          workbookId={id}
          workbookName={workbook.workbook_name}
          editable={canEdit}
          collab
          embedded={embedded}
          record={workbook}
          onProjectMoved={(projectId) =>
            setWorkbook((w) => (w ? { ...w, project_id: projectId } : w))
          }
          chrome={{
            backHref: "/workbooks",
            title: (
              <EditorTitleField
                value={workbook.workbook_name}
                editable={canEdit}
                placeholder="Untitled spreadsheet"
                onCommit={applyRename}
              />
            ),
            titleMarks: (
              <FileTitleMarks
                adapter={WORKBOOK_ADAPTER}
                row={workbook}
                canManage={isOwner}
                onProjectMoved={(projectId) =>
                  setWorkbook((w) => (w ? { ...w, project_id: projectId } : w))
                }
              />
            ),
            actions: (
              <ShareButton
                resourceType="workbook"
                resourceId={workbook.id}
                resourceName={workbook.workbook_name}
                isOwner={isOwner}
                variant="primary"
              />
            ),
            ...(canEdit ? { onRename: applyRename } : {}),
          }}
        />
      ) : (
        <>
          {embedded ? null : (
            <RouteHeader
              left={<ChevronLeftTapButton href="/workbooks" ariaLabel="Back" />}
            />
          )}
          <div className={embedded ? "h-full" : "h-full pt-[var(--shell-header-h)]"}>
            <EditorBootSpinner />
          </div>
        </>
      )}
    </SurfaceRuntimeProvider>
  );
}
