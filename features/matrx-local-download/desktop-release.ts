import { formatFileSize } from "@ai-matrx/kit/format";

/**
 * The current Matrx Desktop release for each OS, read from the update feed the app itself uses
 * (matrx-desktop electron-builder.yml: one feed per OS). The feed names its file in the same
 * folder, so a download link follows every release with no version written in this repo. An OS
 * whose feed has no release yet (Windows and Linux until their first publish) reads as `null`, and
 * the page says it is coming. Server-side only; the fetch is revalidated, and a failed read is
 * `null` for the caller to say so.
 */
export type MatrxDesktopOs = "mac" | "windows" | "linux";

const FEED_BASE = "https://cdn.matrxserver.com/releases/matrx-desktop";

/** Each OS's feed: electron-updater's own file names. */
export const MATRX_DESKTOP_FEEDS: Readonly<Record<MatrxDesktopOs, string>> = {
  mac: `${FEED_BASE}/mac/latest-mac.yml`,
  windows: `${FEED_BASE}/win/latest.yml`,
  linux: `${FEED_BASE}/linux/latest-linux.yml`,
};

/** The stable address that always redirects to the newest file (`app/(public)/desktop/download`). */
export function matrxDesktopDownloadPath(os: MatrxDesktopOs): string {
  return os === "mac" ? "/desktop/download" : `/desktop/download?os=${os}`;
}

/** How long a read of a feed is reused before it is checked again. */
export const MATRX_DESKTOP_FEED_REVALIDATE_SECONDS = 600;

export interface MatrxDesktopRelease {
  os: MatrxDesktopOs;
  version: string;
  /** Absolute URL of the file on the CDN. */
  url: string;
  /** Bytes, when the feed lists it. */
  sizeBytes: number | null;
  /** ISO timestamp, when the feed lists it. */
  releaseDate: string | null;
}

/** The file a person downloads on each OS: the Mac's signed zip, Windows' installer, Linux's .deb (else its AppImage). */
const FILE: Readonly<Record<MatrxDesktopOs, RegExp>> = {
  mac: /^[\w.+-]+\.zip$/,
  windows: /^[\w.+-]+\.exe$/,
  linux: /^[\w.+-]+\.(deb|AppImage)$/,
};

function topLevelValue(yml: string, key: string): string | null {
  const match = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, "m").exec(yml);
  if (!match) return null;
  return match[1].replace(/^['"]|['"]$/g, "");
}

/** The feed's `files:` entries: each url with its size. */
function fileEntries(yml: string): Array<{ url: string; size: number | null }> {
  const out: Array<{ url: string; size: number | null }> = [];
  const re = /-[ \t]+url:[ \t]*(\S+)[\s\S]*?(?=\n[ \t]*-[ \t]+url:|\n\S|$)/g;
  for (const m of yml.matchAll(re)) {
    const size = /size:[ \t]*(\d+)/.exec(m[0]);
    out.push({ url: m[1].replace(/^['"]|['"]$/g, ""), size: size ? Number(size[1]) : null });
  }
  return out;
}

/** Pure: turns an OS's feed text into its release, or null when it names no safe file for that OS. */
export function parseMatrxDesktopFeed(yml: string, os: MatrxDesktopOs, feedUrl: string = MATRX_DESKTOP_FEEDS[os]): MatrxDesktopRelease | null {
  const version = topLevelValue(yml, "version");
  if (!version) return null;
  const files = fileEntries(yml);
  // Linux: the .deb when the feed carries one (Ubuntu and Debian install it with a double-click).
  const deb = os === "linux" ? files.find((f) => /\.deb$/.test(f.url)) : undefined;
  const path = deb?.url ?? topLevelValue(yml, "path");
  // A bare file name only: the feed can never point the button at another place.
  if (!path || !FILE[os].test(path)) return null;
  const entry = files.find((f) => f.url === path);
  return {
    os,
    version,
    url: new URL(path, feedUrl).toString(),
    sizeBytes: entry?.size ?? null,
    releaseDate: topLevelValue(yml, "releaseDate"),
  };
}

/** Reads one OS's live feed (revalidated). Null when it is unreachable, unreadable or has no release yet. */
export async function getMatrxDesktopRelease(os: MatrxDesktopOs): Promise<MatrxDesktopRelease | null> {
  try {
    const response = await fetch(MATRX_DESKTOP_FEEDS[os], {
      next: { revalidate: MATRX_DESKTOP_FEED_REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return parseMatrxDesktopFeed(await response.text(), os);
  } catch {
    return null;
  }
}

export function formatDownloadSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  return formatFileSize(bytes, { base: 1000 });
}
