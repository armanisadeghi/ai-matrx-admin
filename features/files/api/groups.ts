/**
 * features/files/api/groups.ts
 *
 * User groups (for bulk permissions).
 *
 * Backend contract: features/files/cloud_files_frontend.md §6 (Groups).
 *
 * DB tables: cloud_user_groups + cloud_user_group_members. (The Python doc
 * uses `cloud_file_groups` naming; see PYTHON_TEAM_COMMS.md.)
 */

import {
  del,
  getJson,
  postJson,
  type RequestOptions,
  type ResponseMeta,
} from "./client";
import type {
  AddGroupMemberRequest,
  CloudUserGroupMemberRow,
  CloudUserGroupRow,
  CreateGroupRequest,
} from "../types";

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export async function listGroups(
  opts: RequestOptions = {},
): Promise<{ data: CloudUserGroupRow[]; meta: ResponseMeta }> {
  return getJson<CloudUserGroupRow[]>("/files/groups", opts);
}

export async function createGroup(
  body: CreateGroupRequest,
  opts: RequestOptions = {},
): Promise<{ data: CloudUserGroupRow; meta: ResponseMeta }> {
  return postJson<CloudUserGroupRow, CreateGroupRequest>(
    "/files/groups",
    body,
    opts,
  );
}

// ---------------------------------------------------------------------------
// Group members
// ---------------------------------------------------------------------------

export async function listGroupMembers(
  groupId: string,
  opts: RequestOptions = {},
): Promise<{ data: CloudUserGroupMemberRow[]; meta: ResponseMeta }> {
  return getJson<CloudUserGroupMemberRow[]>(
    `/files/groups/${groupId}/members`,
    opts,
  );
}

export async function addGroupMember(
  groupId: string,
  body: AddGroupMemberRequest,
  opts: RequestOptions = {},
): Promise<{ data: CloudUserGroupMemberRow; meta: ResponseMeta }> {
  return postJson<CloudUserGroupMemberRow, AddGroupMemberRequest>(
    `/files/groups/${groupId}/members`,
    body,
    opts,
  );
}

export async function removeGroupMember(
  groupId: string,
  userId: string,
  opts: RequestOptions = {},
): Promise<{ data: null; meta: ResponseMeta }> {
  return del<null>(`/files/groups/${groupId}/members/${userId}`, opts);
}
