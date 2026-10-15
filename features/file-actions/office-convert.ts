/**
 * Download → OpenDocument / Rich Text for the editors: the editor builds its OpenXML file in the
 * browser, `POST /office/convert-document` (LibreOffice, aidream's office service) returns it as
 * .ods / .odt / .rtf / .odp, and the browser saves it. Nothing is stored server-side.
 */

import { downloadFile } from "@ai-matrx/kit/download";

import { requestRaw } from "@/lib/python-client";

export type OpenFormatTarget = "ods" | "odt" | "rtf" | "odp";

const MIME: Record<OpenFormatTarget, string> = {
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  odp: "application/vnd.oasis.opendocument.presentation",
};

/**
 * Send OpenXML bytes to the converter; resolves to the converted bytes. Goes through the canonical
 * client (`requestRaw`), which carries the bearer token AND the active organization (`X-Organization-Id`)
 * the server refuses a request without.
 */
export async function convertOpenXml(
  bytes: Uint8Array,
  inputName: string,
  target: OpenFormatTarget,
  request: typeof requestRaw = requestRaw,
): Promise<Blob> {
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart]), inputName);
  form.append("target", target);
  const res = await request("/office/convert-document", { method: "POST", body: form }, { allowHttpError: true });
  if (!res.ok) {
    let detail = "";
    try {
      detail = ((await res.json()) as { detail?: string }).detail ?? "";
    } catch {
      /* body was not JSON */
    }
    throw new Error(detail || `The converter answered ${res.status}.`);
  }
  return new Blob([await res.arrayBuffer()], { type: MIME[target] });
}

/** Convert and save as `<baseName>.<target>`. */
export async function downloadOpenXmlAs(
  bytes: Uint8Array,
  inputName: string,
  baseName: string,
  target: OpenFormatTarget,
): Promise<void> {
  const blob = await convertOpenXml(bytes, inputName, target);
  downloadFile(`${baseName.replace(new RegExp(`\\.${target}$`, "i"), "")}.${target}`, blob, blob.type);
}
