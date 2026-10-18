import "server-only";

// features/portals/hers.ts — HER ROWS OF ONE TABLE, READ ONCE PER REQUEST.
// The portal page's list sections and its blocks both need them; the door is asked one time
// (through her own client, kept to her client by `isHers`) and everything on the page — a count,
// a chart, a list — is drawn from this one answer, so two blocks can never disagree.

import { cache } from "react";

import { portalRecords, type PortalMembership, type PortalRecord, type PortalTable } from "./service";
import { isHers, shownFields, type ShownField } from "./shown";

export const hersOf = cache(
  async (organizationId: string, tableId: string, namesVia: string, clientRecordId: string): Promise<PortalRecord[]> => {
    const rows = await portalRecords({ organizationId, tableId });
    return rows.filter((r) => isHers(r.document, namesVia || null, clientRecordId));
  },
);

export interface TableData {
  table: PortalTable;
  fields: ShownField[];
  records: PortalRecord[];
}

export async function tableData(membership: PortalMembership, table: PortalTable): Promise<TableData> {
  const [fields, records] = await Promise.all([
    shownFields(membership.organization_id, table),
    hersOf(membership.organization_id, table.table_id, table.names_via ?? "", membership.client_record_id),
  ]);
  return { table, fields, records };
}
