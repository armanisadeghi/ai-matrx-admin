/**
 * Download → OpenDocument / Rich Text for the editors: the editor builds its OpenXML file in the
 * browser, `POST /office/convert-document` (LibreOffice, aidream's office service) returns it as
 * .ods / .odt / .rtf / .odp, and the browser saves it. Nothing is stored server-side.
 */

import { downloadFile } from "@ai-matrx/kit/download";

import { resolveBaseUrl } from "@/lib/python-client";
import { getStoreSingleton } from "@/lib/redux/store-singleton";
import { selectAccessToken } from "@/lib/redux/slices/userSlice";

export type OpenFormatTarget = "ods" | "odt" | "rtf" | "odp";

const MIME: Record<OpenFormatTarget, string> = {
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  odp: "application/vnd.oasis.opendocument.presentation",
};

/** Send OpenXML bytes to the converter; resolves to the converted bytes. */
export async function convertOpenXml(
  bytes: Uint8Array,
  inputName: string,
  target: OpenFormatTarget,
  fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
  const store = getStoreSingleton();
  const token = store ? selectAccessToken(store.getState()) : null;
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart]), inputName);
  form.append("target", target);
  const res = await fetchImpl(`${resolveBaseUrl().replace(/\/$/, "")}/office/convert-document`, {
    method: "POST",
    body: form,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
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
