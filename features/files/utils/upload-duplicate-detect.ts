/**
 * features/files/utils/upload-duplicate-detect.ts
 *
 * Pre-flight duplicate detection for uploads. Two things to catch:
 *
 *   1. **Identical content** — there's already a file in the same
 *      folder with the SAME SHA-256 checksum. Uploading again wastes
 *      bytes and storage quota. The user almost always wants to NOT
 *      do this, but we let them (e.g. they intentionally want a
 *      second copy with a different name in another folder).
 *
 *   2. **Same filename, different content** — a file with the same
 *      name exists, but its bytes are different. Default Drive /
 *      Dropbox behaviour offers Overwrite (version-bump) vs Make a
 *      copy (auto " (1)") vs Skip.
 *
 * Both cases are surfaced to the user via the `DuplicateUploadDialog`.
 * This file is a pure functional helper — no React, no Redux dispatch
 * — so it can be tested in isolation and reused by any upload entry
 * point.
 */

import type { CloudFile } from "@/features/files/types";

export type DuplicateKind =
  | "identical_content_same_folder"
  | "identical_content_other_folder"
  | "name_only";

export interface DuplicateMatch {
  /** What kind of conflict this is — drives the dialog's wording. */
  kind: DuplicateKind;
  /** The existing file the new upload conflicts with. */
  existing: CloudFile;
}

export interface DuplicateInputFile {
  file: File;
  /** SHA-256 hex (lowercase). `null` when hashing failed / unsupported. */
  checksum: string | null;
}

export interface DuplicateScanArgs {
  files: DuplicateInputFile[];
  /** The folder the upload is targeting. `null` = root. */
  parentFolderId: string | null;
  /** Redux `filesById` snapshot. */
  filesById: Record<string, CloudFile>;
}

export interface DuplicateScanResult {
  /** One entry per input file, same order. `null` = no conflict. */
  matches: (DuplicateMatch | null)[];
  /** Convenience: count of files that triggered any kind of match. */
  conflictCount: number;
}

/**
 * Scan a batch of upload candidates against the user's current cloud
 * files. Folder boundaries matter — uploading "logo.png" to /Brand
 * doesn't conflict with "logo.png" already living in /Old. We DO
 * report identical-content matches across folders separately so the
 * UI can offer "you already have this exact file in 〈other-folder〉
 * — keep using that one?" as a third option.
 *
 * Real (non-virtual), non-deleted files only.
 */
export function scanForDuplicates({
  files,
  parentFolderId,
  filesById,
}: DuplicateScanArgs): DuplicateScanResult {
  // Pre-build two indexes so the per-file scan is O(N + M) instead of
  // O(N × M). Real cost only hits when the user has thousands of files.
  const byChecksumThisFolder = new Map<string, CloudFile>();
  const byChecksumOtherFolder = new Map<string, CloudFile>();
  const byNameThisFolder = new Map<string, CloudFile>();
  for (const f of Object.values(filesById)) {
    if (!f) continue;
    if (f.deletedAt) continue;
    if (f.source.kind !== "real") continue;
    const inThisFolder = (f.parentFolderId ?? null) === (parentFolderId ?? null);
    if (f.checksum) {
      if (inThisFolder) {
        if (!byChecksumThisFolder.has(f.checksum)) {
          byChecksumThisFolder.set(f.checksum, f);
        }
      } else if (!byChecksumOtherFolder.has(f.checksum)) {
        byChecksumOtherFolder.set(f.checksum, f);
      }
    }
    if (inThisFolder) {
      const lowered = f.fileName.toLowerCase();
      if (!byNameThisFolder.has(lowered)) {
        byNameThisFolder.set(lowered, f);
      }
    }
  }

  let conflictCount = 0;
  const matches: (DuplicateMatch | null)[] = files.map(
    ({ file, checksum }): DuplicateMatch | null => {
      // 1. Same checksum in the same folder — the strongest match.
      //    User definitely wasted a click; almost certainly wants to skip.
      if (checksum) {
        const sameFolder = byChecksumThisFolder.get(checksum);
        if (sameFolder) {
          return {
            kind: "identical_content_same_folder",
            existing: sameFolder,
          };
        }
      }

      // 2. Same filename in the same folder. This is "real" conflict —
      //    user has a different file with this name already.
      const nameMatch = byNameThisFolder.get(file.name.toLowerCase());
      if (nameMatch) {
        // If checksums match, downgrade to identical-content (no point
        // pretending it's a name conflict when the bytes are identical).
        if (checksum && nameMatch.checksum === checksum) {
          return {
            kind: "identical_content_same_folder",
            existing: nameMatch,
          };
        }
        return { kind: "name_only", existing: nameMatch };
      }

      // 3. Identical content in another folder. Only worth surfacing
      //    when there's no conflict in the target folder, and we have
      //    a checksum to be sure.
      if (checksum) {
        const otherFolder = byChecksumOtherFolder.get(checksum);
        if (otherFolder) {
          return {
            kind: "identical_content_other_folder",
            existing: otherFolder,
          };
        }
      }

      return null;
    },
  );
  for (const m of matches) if (m) conflictCount++;
  return { matches, conflictCount };
}
