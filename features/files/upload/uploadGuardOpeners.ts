/**
 * features/files/upload/uploadGuardOpeners.ts
 *
 * Module-level imperative API for the upload-guard system. Same shape
 * as `cloudFilesPickerOpeners` — a single host component registers a
 * handler at mount, and any code anywhere can call `requestUpload`
 * without threading state.
 *
 * The host pre-flights uploaded files for duplicates (identical
 * checksum or filename collisions in the target folder), shows a
 * resolution dialog if needed, and only then dispatches the upload.
 * If the host hasn't mounted yet, `requestUpload` warns in dev and
 * falls back to a direct thunk dispatch so we don't break the upload
 * for the (rare) caller that fires during boot.
 *
 * Pure TypeScript — no React, no dialog markup. Safe to import from
 * anywhere, including the static graph of route entries.
 */

import type { UploadFilesArg } from "@/features/files/types";

/**
 * The handler the host registers at mount. Returns a promise that
 * resolves with the same shape as the underlying `uploadFiles` thunk
 * payload — `{ uploaded: string[], failed: [...] }`.
 */
export type UploadGuardHandler = (
  arg: UploadFilesArg,
) => Promise<UploadGuardResult>;

export interface UploadGuardResult {
  uploaded: string[];
  failed: Array<{ name: string; error: string }>;
  /** True when the user dismissed the duplicate dialog. */
  cancelled: boolean;
}

let registered: UploadGuardHandler | null = null;

/** Called once by the host's `useEffect` mount. */
export function registerUploadGuardHandler(handler: UploadGuardHandler): void {
  registered = handler;
}

/** Called by the host's cleanup. */
export function unregisterUploadGuardHandler(handler: UploadGuardHandler): void {
  if (registered === handler) registered = null;
}

/**
 * Public entry point. Call from any UI surface that initiates an
 * upload (drag-drop, paste, FAB, picker). Returns the same shape as
 * `uploadFiles.unwrap()` plus a `cancelled` flag.
 *
 * Behaviour:
 *   - If the host is mounted: pre-flight scan → optional dialog →
 *     dispatch with the user's choices. Resolves when uploads finish
 *     or when the user cancels (`cancelled: true`, no dispatch).
 *   - If the host is NOT mounted: dispatches directly with no
 *     duplicate check, so old call paths keep working. Logs a dev
 *     warning so the missing host gets noticed.
 */
export async function requestUpload(
  arg: UploadFilesArg,
): Promise<UploadGuardResult> {
  if (registered) {
    return registered(arg);
  }
  // Fallback path — should rarely fire in practice. Imported lazily
  // to keep this opener module dispatch-free at module load.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[upload-guard] requestUpload called before <UploadGuardHost/> mounted — falling back to direct dispatch with no duplicate check.",
    );
  }
  const [{ getStore }, { uploadFiles }] = await Promise.all([
    import("@/lib/redux/store"),
    import("@/features/files/redux/thunks"),
  ]);
  const store = getStore();
  if (!store) {
    return {
      uploaded: [],
      failed: arg.files.map((f) => ({
        name: f.name,
        error: "Store not ready",
      })),
      cancelled: false,
    };
  }
  try {
    const result = await store
      .dispatch(uploadFiles(arg))
      .unwrap();
    return { ...result, cancelled: false };
  } catch (err) {
    return {
      uploaded: [],
      failed: arg.files.map((f) => ({
        name: f.name,
        error: err instanceof Error ? err.message : String(err),
      })),
      cancelled: false,
    };
  }
}
