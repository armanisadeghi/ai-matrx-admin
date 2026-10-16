// MOVED to @ai-matrx/media/files/engine/upload/uploadGuardOpeners (P16f — the files engine lives in @ai-matrx/media).
// This path stays so the app's importers keep working; grow it in the package. A jest.mock of
// THIS path reaches only importers of this path — mock the package module to reach the engine/chat.
// Loading this module wires the engine to the app (the host port), wherever it is imported.
import "@/features/files/files-host";
import { requestUpload as requestUploadFromEngine } from "@ai-matrx/media/files/engine/upload/uploadGuardOpeners";
import { ensureDialogHosts } from "@/components/dialogs/host/dialogHostsLatch";
export * from "@ai-matrx/media/files/engine/upload/uploadGuardOpeners";

/**
 * The guard's host loads on first engagement (<DialogHosts />), and the engine's
 * `requestUpload` does not queue — without a host it uploads with no duplicate check.
 * So wait for the host first (this local export shadows the star re-export).
 */
export async function requestUpload(
  arg: Parameters<typeof requestUploadFromEngine>[0],
): ReturnType<typeof requestUploadFromEngine> {
  await ensureDialogHosts();
  return requestUploadFromEngine(arg);
}
