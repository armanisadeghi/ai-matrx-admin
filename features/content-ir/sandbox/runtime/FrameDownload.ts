/**
 * Frame stand-in for `@ai-matrx/kit/download` (aliased in build-kind-sandbox.ts).
 *
 * The sealed frame has no `allow-downloads`, so the kit's anchor click does
 * nothing there — the copy menu's Export items were dead inside a shape. Every
 * download from the frame is relayed to the host's `download` action (the
 * same door `runAction("download", …)` uses), which saves through the real
 * `@ai-matrx/kit/download` in the page. Content always travels as a Blob, so
 * a large export is never refused by the frame message size cap.
 *
 * Same signatures as the kit's module. A refusal is announced, never silent
 * (the host also shows it as a toast).
 */
import { requestHostAction } from "./host-action-relay";

function announce(error: string | undefined): void {
    // eslint-disable-next-line no-console
    console.warn(`[kind-sandbox] download refused: ${error ?? "no reason given"}`);
}

export function downloadFile(filename: string, content: BlobPart, mime: string): void {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    void requestHostAction("download", { filename, content: blob, mime }).then((out) => {
        if (!out.ok) announce(out.error);
    });
}

function dataUrlBlob(url: string): Blob | null {
    const match = /^data:([^,;]*)(;base64)?,(.*)$/s.exec(url);
    if (!match) return null;
    const [, mime, base64, body] = match;
    try {
        if (!base64) return new Blob([decodeURIComponent(body ?? "")], { type: mime || "text/plain" });
        const binary = atob(body ?? "");
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime || "application/octet-stream" });
    } catch {
        return null;
    }
}

export function downloadUrl(url: string, filename: string, _options: { newTab?: boolean } = {}): void {
    const blob = url.startsWith("data:") ? dataUrlBlob(url) : null;
    if (blob) {
        downloadFile(filename, blob, blob.type);
        return;
    }
    if (/^https?:\/\//i.test(url)) {
        void requestHostAction("open_url", { url }).then((out) => {
            if (!out.ok) announce(out.error);
        });
        return;
    }
    announce(`"${url.slice(0, 40)}" cannot be saved from inside a shape.`);
}
