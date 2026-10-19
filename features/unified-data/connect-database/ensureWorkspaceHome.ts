// features/unified-data/connect-database/ensureWorkspaceHome.ts — AT-SYNCHOME (2026-10-19).
//
// A workspace's DATA HOME is one record in the Organization kernel (custom.organization_home_id reads it;
// custom.table_copy_sync refuses without it). The store's own ensure_home (matrx_records client.py) makes it
// as a plain record write into that kernel, named "Workspace". This is the same write, as the signed-in person:
// the door's own membership checks decide whether it lands, and its sentence is handed back unchanged.

import type { RecordsClient } from "@ai-matrx/records/core";
import type { RecordsDataSource } from "@ai-matrx/records";

import { organizationKernelId } from "../hub/doors";

export const DEFAULT_HOME_NAME = "Workspace";

export async function ensureWorkspaceHome(
  client: Pick<RecordsClient, "recordWrite">,
  dataSource: RecordsDataSource,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const kernel = await organizationKernelId(dataSource);
  if (!kernel.ok) return { ok: false, message: kernel.error.message };
  const made = await client.recordWrite({
    table_id: kernel.data,
    data: {
      name: DEFAULT_HOME_NAME,
      description: "Where this workspace's tables live. Made the first time something needed a home.",
    },
  });
  if (!made.ok) return { ok: false, message: made.error.message };
  return { ok: true };
}
