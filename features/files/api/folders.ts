/**
 * features/files/api/folders.ts
 *
 * Folder listing via REST. Folder CRUD is handled through file-move operations
 * on the backend (no dedicated folder-create endpoint in the current contract
 * — logged in PYTHON_TEAM_COMMS.md if we need one).
 *
 * Backend contract: features/files/cld_files_frontend.md §6.
 */

import { getJson, type RequestOptions, type ResponseMeta } from "./client";
import type { CloudFolderRow } from "@/features/files/types";

export async function listFolders(
  params: { parentPath?: string } = {},
  opts: RequestOptions = {},
): Promise<{ data: CloudFolderRow[]; meta: ResponseMeta }> {
  const q = params.parentPath
    ? `?parent_path=${encodeURIComponent(params.parentPath)}`
    : "";
  return getJson<CloudFolderRow[]>(`/files/folders${q}`, opts);
}
