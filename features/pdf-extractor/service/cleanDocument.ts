/**
 * PDF Extractor — one clean request, with the single-flight contract.
 *
 * The server runs ONE clean per document. A second request while one is live
 * answers 409 `clean_in_progress` with the live run's id: that is not an error
 * — we rejoin the live run (`followServerJob`, via `resolveEndedClean`), show
 * its live progress, and reload the saved document once when it settles. A 409
 * is never retried. A doc that is already cleaned answers (force=false) with a
 * short stream carrying the existing text — no second request either.
 *
 * `stream` / `follow` are injectable so the decision is unit-testable.
 */
import type { MatrxTransport } from "@ai-matrx/api";
import {
  resolveEndedClean,
  type EndedCleanResolution,
} from "./followEndedClean";
import {
  streamPdfClean,
  type StreamPdfCleanCallbacks,
  type StreamPdfCleanResult,
} from "./streamPdf";

export type CleanDocumentOutcome<TDoc> =
  | { kind: "streamed"; result: StreamPdfCleanResult }
  | {
      kind: "joined";
      requestId: string;
      resolution: EndedCleanResolution<TDoc>;
    };

export async function cleanDocument<TDoc>(args: {
  docId: string;
  /** Auto-run on open = false; every manual button = true. */
  force: boolean;
  callbacks?: StreamPdfCleanCallbacks;
  signal?: AbortSignal;
  transport: () => MatrxTransport;
  reload: () => Promise<TDoc | null>;
  onJoinFrame?: Parameters<typeof resolveEndedClean>[0]["onFrame"];
  /** Called with the live run's id when this request joined instead of starting. */
  onJoin?: (requestId: string) => void;
  stream?: typeof streamPdfClean;
  follow?: Parameters<typeof resolveEndedClean>[0]["follow"];
}): Promise<CleanDocumentOutcome<TDoc>> {
  const { stream = streamPdfClean } = args;
  const result = await stream({
    docId: args.docId,
    force: args.force,
    callbacks: args.callbacks,
    signal: args.signal,
  });
  if (!result.inProgress) return { kind: "streamed", result };
  const { requestId } = result.inProgress;
  args.onJoin?.(requestId);
  const resolution = await resolveEndedClean<TDoc>({
    transport: args.transport(),
    docId: args.docId,
    requestId,
    reload: args.reload,
    signal: args.signal,
    onFrame: args.onJoinFrame,
    follow: args.follow,
  });
  return { kind: "joined", requestId, resolution };
}
