/**
 * Client-side ZIP bundler.
 * Takes a list of { filename, dataUrl } entries, produces a Blob ZIP using
 * JSZip (browser bundle), and triggers a download.
 */

import JSZip from "jszip";

export interface BundleEntry {
    /** Sub-folder inside the ZIP. Omit for root. */
    folder?: string;
    filename: string;
    /** data:mime;base64,... */
    dataUrl: string;
}

function dataUrlToBinary(dataUrl: string): Uint8Array | null {
    const match = /^data:[^;]+;base64,(.+)$/.exec(dataUrl);
    if (!match) return null;
    try {
        const binary = atob(match[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
    } catch {
        return null;
    }
}

export async function downloadVariantsAsZip(
    entries: BundleEntry[],
    zipFilename = "image-studio-export.zip",
): Promise<void> {
    if (entries.length === 0) return;

    const zip = new JSZip();

    for (const entry of entries) {
        const bytes = dataUrlToBinary(entry.dataUrl);
        if (!bytes) continue;
        const path = entry.folder ? `${entry.folder}/${entry.filename}` : entry.filename;
        zip.file(path, bytes);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadSingleVariant(dataUrl: string, filename: string): void {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
}
