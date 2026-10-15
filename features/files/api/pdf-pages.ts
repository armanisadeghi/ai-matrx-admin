import type { RequestOptions } from "@/lib/python-client";
import type { components } from "@ai-matrx/api/types";
import { selectPdfPages as selectPdfPagesOp } from "@ai-matrx/api/files";
import { serverApi, callOptionsFrom } from "@/lib/api/server-api";

// Types DERIVED from the OpenAPI contract — never hand-mirrored. A backend
// rename lights up every callsite in the same `pnpm sync-types` PR.
export type PdfPageRange = components["schemas"]["PdfPageRange"];
export type PdfPageSelectionRequest = components["schemas"]["PdfPageSelectionRequest"];
export type PdfOutputPageMap = components["schemas"]["PdfOutputPageMap"];
export type SelectedPdfFileRef = components["schemas"]["FileRef"];
export type PdfPageSelectionResult = components["schemas"]["PdfPageSelectionResult"];

/** Build or reuse one PDF containing only the requested physical source pages. */
export function selectPdfPages(
  fileId: string,
  request: PdfPageSelectionRequest,
  opts: RequestOptions = {},
): Promise<{ data: PdfPageSelectionResult }> {
  return selectPdfPagesOp(serverApi, { path: { file_id: fileId }, body: request }, callOptionsFrom(opts)).then((data) => ({ data }));
}
