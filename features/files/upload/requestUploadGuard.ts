// The files engine's upload guard (media `configureFilesHost({ requestUploadGuard })`, read at call time):
// checksum the files, look for duplicates in the loaded files, upload straight away when there are none, otherwise ask
// the `uploadGuardDialog` overlay (requestOverlay) what to do with each duplicate, then upload with those choices.
// Loaded on the first upload (features/files/files-host.ts imports it lazily).
import type { UploadGuardResult } from "@ai-matrx/media/files/engine/upload/uploadGuardOpeners";
import type { ResolvedDecision } from "@/features/files/components/core/DuplicateUploadDialog/DuplicateUploadDialog";
import { selectAllFilesMap } from "@/features/files/redux/selectors";
import { uploadFiles as uploadFilesThunk } from "@/features/files/redux/thunks";
import type { UploadFilesArg } from "@/features/files/types";
import { computeSHA256Batch } from "@/features/files/utils/checksum";
import { scanForDuplicates, type DuplicateMatch } from "@/features/files/utils/upload-duplicate-detect";
import { requestOverlay } from "@/features/overlays/requestOverlay";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import type { AppStore } from "@/lib/redux/store";

export interface UploadGuardConflict {
  id: string;
  index: number;
  file: File;
  match: DuplicateMatch;
}

export interface UploadGuardDialogRequest {
  conflicts: UploadGuardConflict[];
}

async function runUpload(
  store: AppStore,
  arg: UploadFilesArg,
  aliased: Array<{ inputIndex: number; existingFileId: string }> = [],
): Promise<UploadGuardResult> {
  try {
    const result = await store.dispatch(uploadFilesThunk(arg)).unwrap();
    return { ...result, cancelled: false, aliased };
  } catch (err) {
    return {
      uploaded: [],
      failed: arg.files.map((f) => ({ name: f.name, error: err instanceof Error ? err.message : String(err) })),
      cancelled: false,
      aliased,
    };
  }
}

export async function requestUploadGuard(arg: UploadFilesArg): Promise<UploadGuardResult> {
  const store = getStoreSingleton() as AppStore | null;
  if (!store) throw new Error("[files] upload asked before the app store exists");
  const checksums = await computeSHA256Batch(arg.files);
  const scan = scanForDuplicates({
    files: arg.files.map((file, i) => ({ file, checksum: checksums[i] ?? null })),
    parentFolderId: arg.parentFolderId ?? null,
    filesById: selectAllFilesMap(store.getState()),
  });
  if (scan.conflictCount === 0) return runUpload(store, arg);

  const conflicts: UploadGuardConflict[] = [];
  scan.matches.forEach((match, index) => {
    if (match) conflicts.push({ id: `${index}`, index, file: arg.files[index], match });
  });
  const decisions = await requestOverlay<UploadGuardDialogRequest, ResolvedDecision[] | null>(
    "uploadGuardDialog",
    { conflicts },
    { cancel: null },
  );
  if (!decisions) return { uploaded: [], failed: [], cancelled: true, aliased: [] };

  const filenameOverrides: Record<number, string> = {};
  const skipIndices: number[] = [];
  const forceNewCopyIndices: number[] = [];
  const aliased: Array<{ inputIndex: number; existingFileId: string }> = [];
  const decisionById = new Map(decisions.map((d) => [d.id, d.action]));
  for (const c of conflicts) {
    const action = decisionById.get(c.id) ?? "skip";
    if (action === "use_existing") {
      aliased.push({ inputIndex: c.index, existingFileId: c.match.existing.duplicateOfFileId ?? c.match.existing.id });
      skipIndices.push(c.index);
    } else if (action === "skip") {
      skipIndices.push(c.index);
    } else if (action === "overwrite") {
      filenameOverrides[c.index] = c.match.existing.fileName;
    } else if (action === "copy") {
      forceNewCopyIndices.push(c.index);
    }
  }
  if (skipIndices.length === arg.files.length) return { uploaded: [], failed: [], cancelled: false, aliased };
  return runUpload(
    store,
    {
      ...arg,
      filenameOverrides: { ...(arg.filenameOverrides ?? {}), ...filenameOverrides },
      skipIndices: [...(arg.skipIndices ?? []), ...skipIndices],
      forceNewCopyIndices: [...(arg.forceNewCopyIndices ?? []), ...forceNewCopyIndices],
    },
    aliased,
  );
}
