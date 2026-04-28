"use client";

/**
 * features/code/editor/BinaryFileViewer.tsx
 *
 * Replaces Monaco for tabs that can't be rendered as text — images,
 * videos, audio, PDFs, and any "generic" binary the adapter happens to
 * have (archives, sqlite, office docs, etc.).
 *
 * It's deliberately built on top of the cloud-files preview primitives
 * (`ImagePreview`, `VideoPreview`, `AudioPreview`, `GenericPreview`) so
 * we get one preview UX across the app instead of two. Those primitives
 * accept either a URL or a fileId; we use the URL variants so the viewer
 * can stay decoupled from the cloud-files Redux slice.
 *
 * Bytes are pulled lazily via `filesystem.download(path)` (or a base64
 * fallback for adapters that only ship `readFileBinary`). The resulting
 * `blob:` URL is owned by this component and revoked on unmount or path
 * change — base64 buffers never enter Redux, so nothing pinned in the
 * tabs slice ever holds a multi-megabyte image string in memory.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Download as DownloadIcon, Loader2 } from "lucide-react";
import { ImagePreview } from "@/features/files/components/core/FilePreview/previewers/ImagePreview";
import { VideoPreview } from "@/features/files/components/core/FilePreview/previewers/VideoPreview";
import { AudioPreview } from "@/features/files/components/core/FilePreview/previewers/AudioPreview";
import { GenericPreview } from "@/features/files/components/core/FilePreview/previewers/GenericPreview";
import {
  getFilePreviewProfile,
  type PreviewKind,
} from "@/features/files/utils/file-types";
import { useCodeWorkspace } from "../CodeWorkspaceProvider";
import type { EditorFile } from "../types";
import type { FilesystemAdapter } from "../adapters/FilesystemAdapter";
import type { BinaryFilePdfPreviewProps } from "./BinaryFilePdfPreview";

/**
 * The cloud-files PDF previewer is fileId-coupled (`useFileBlob(fileId)`),
 * so we can't reuse it here. We ship our own thin react-pdf wrapper that
 * accepts a Blob/URL directly. Lazy-loaded so non-PDF previews never pay
 * the ~400KB react-pdf + worker bundle cost.
 */
const SandboxPdfPreview = dynamic(
  () => import("./BinaryFilePdfPreview").then((m) => m.BinaryFilePdfPreview),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
) as ComponentType<BinaryFilePdfPreviewProps>;

interface BinaryFileViewerProps {
  tab: EditorFile;
  className?: string;
}

interface BinaryState {
  loading: boolean;
  error: string | null;
  url: string | null;
  blob: Blob | null;
  size: number | null;
}

export function BinaryFileViewer({ tab, className }: BinaryFileViewerProps) {
  const { filesystem } = useCodeWorkspace();

  const profile = useMemo(
    () => getFilePreviewProfile(tab.name, tab.mime ?? null, null),
    [tab.name, tab.mime],
  );

  const [state, setState] = useState<BinaryState>({
    loading: true,
    error: null,
    url: null,
    blob: null,
    size: null,
  });

  // The viewer is the sole owner of the blob URL it creates. We revoke
  // on unmount AND when the path changes — without that, navigating
  // between binary tabs would leak `blob:` allocations until the page
  // refreshed.
  const lastUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, url: null, blob: null, size: null });
    if (lastUrlRef.current) {
      URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = null;
    }

    void (async () => {
      try {
        const blob = await fetchBinary(filesystem, tab.path, profile.mime);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        lastUrlRef.current = url;
        setState({
          loading: false,
          error: null,
          url,
          blob,
          size: blob.size,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : String(err),
          url: null,
          blob: null,
          size: null,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (lastUrlRef.current) {
        URL.revokeObjectURL(lastUrlRef.current);
        lastUrlRef.current = null;
      }
    };
  }, [filesystem, tab.path, profile.mime]);

  const handleDownload = useCallback(() => {
    if (!state.blob) return;
    const url = URL.createObjectURL(state.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tab.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // The temporary anchor URL is independent from `state.url`; revoke
    // it on the next tick so the download has a chance to start.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [state.blob, tab.name]);

  if (state.loading) {
    return (
      <div className={loadingClass(className)}>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">
          Loading {tab.name}…
        </span>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className={errorClass(className)} role="alert">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1 text-center max-w-md">
          <h3 className="text-sm font-semibold">
            Couldn&apos;t load this file
          </h3>
          <p className="text-xs text-muted-foreground break-words">
            {state.error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass(className)}>
      <BinaryPreviewer
        kind={profile.previewKind}
        url={state.url}
        blob={state.blob}
        mime={profile.mime}
        fileName={tab.name}
        fileSize={state.size}
        onDownload={handleDownload}
      />
    </div>
  );
}

interface PreviewerProps {
  kind: PreviewKind;
  url: string | null;
  blob: Blob | null;
  mime: string;
  fileName: string;
  fileSize: number | null;
  onDownload: () => void;
}

function BinaryPreviewer({
  kind,
  url,
  blob,
  mime,
  fileName,
  fileSize,
  onDownload,
}: PreviewerProps) {
  switch (kind) {
    case "image":
      return (
        <ImagePreview url={url} fileName={fileName} className="h-full w-full" />
      );
    case "video":
      return (
        <VideoPreview url={url} mimeType={mime} className="h-full w-full" />
      );
    case "audio":
      return (
        <AudioPreview
          url={url}
          fileName={fileName}
          mimeType={mime}
          className="h-full w-full"
        />
      );
    case "pdf":
      return blob ? (
        <SandboxPdfPreview
          blob={blob}
          url={url}
          fileName={fileName}
          className="h-full w-full"
        />
      ) : null;
    default:
      return (
        <GenericPreview
          fileName={fileName}
          fileSize={fileSize}
          onDownload={onDownload}
          className="h-full w-full"
        />
      );
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

const containerClass = (extra?: string) =>
  `flex h-full w-full overflow-hidden bg-background ${extra ?? ""}`;
const loadingClass = (extra?: string) =>
  `flex h-full w-full items-center justify-center bg-background ${extra ?? ""}`;
const errorClass = (extra?: string) =>
  `flex h-full w-full flex-col items-center justify-center gap-3 p-6 bg-background ${extra ?? ""}`;

/**
 * Pulls the file's bytes through whatever the adapter exposes, in
 * preference order:
 *
 *   1. `download(path)` — already returns a Blob (Sandbox adapter).
 *   2. `readFileBinary(path)` — base64 fallback (any adapter that
 *      bothers to advertise binary support).
 *   3. `readFile(path)` — last resort. Only safe for actually-textual
 *      files; we still wrap the string into a Blob so the previewer
 *      pipeline stays uniform. (Mock adapter takes this branch.)
 *
 * The resulting Blob is tagged with `profileMime` so previewers that
 * care about MIME (Video, Audio, PDF) get a meaningful type instead of
 * the empty default.
 */
async function fetchBinary(
  filesystem: FilesystemAdapter,
  path: string,
  profileMime: string,
): Promise<Blob> {
  if (typeof filesystem.download === "function") {
    const raw = await filesystem.download(path);
    return raw.type ? raw : new Blob([raw], { type: profileMime });
  }
  if (typeof filesystem.readFileBinary === "function") {
    const base64 = await filesystem.readFileBinary(path);
    const bytes = base64ToUint8Array(base64);
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return new Blob([buffer], { type: profileMime });
  }
  const text = await filesystem.readFile(path);
  return new Blob([text], { type: profileMime });
}

function base64ToUint8Array(base64: string): Uint8Array {
  // `window.atob` is strict about whitespace; PEM / MIME base64 wraps
  // lines at 64 chars and would blow up here without the strip.
  const cleaned = base64.replace(/\s+/g, "");
  const binary =
    typeof window !== "undefined"
      ? window.atob(cleaned)
      : Buffer.from(cleaned, "base64").toString("binary");
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// `DownloadIcon` re-export so consumers that wrap this viewer in a custom
// chrome can reuse the same icon without pulling lucide-react themselves.
export { DownloadIcon };
