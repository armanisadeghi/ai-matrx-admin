// features/hr/people/directory/directoryExportAction.ts
//
// The directory's Export. SPEC-EMPLOYEES §2.2: an export is an AUDITED act, so the door
// (`hr.directory_export_log`) records it per employer FIRST; the file is built only for the
// employers whose audit row was written, from rows already read through `hr_directory_list`
// (directory-tier columns only), through the kit's CSV/download doors.

import { Download } from "lucide-react";
import { downloadFile } from "@ai-matrx/kit/download";
import { csvExportItem, exportFilename } from "@/components/agent-copy/export";
import type { EntityBulkAction } from "@/lib/entity-list/selection";
import { logHrDirectoryExport } from "../../service";
import type { HrScopedDirectoryRow } from "./useHrDirectory";

export const HR_DIRECTORY_EXPORT_COLUMNS = [
  { key: "display_name", header: "Name" },
  { key: "employee_number", header: "Employee number" },
  { key: "work_email", header: "Work email" },
  { key: "work_phone", header: "Work phone" },
  { key: "directory_status", header: "Status" },
  { key: "job_title", header: "Job title" },
  { key: "department", header: "Department" },
  { key: "location", header: "Location" },
  { key: "employer", header: "Employer" },
] as const;

function toRecord(row: HrScopedDirectoryRow): Record<string, unknown> {
  return {
    display_name: row.display_name,
    employee_number: row.employee_number,
    work_email: row.work_email,
    work_phone: row.work_phone,
    directory_status: row.directory_status,
    job_title: row.job_title,
    department: row.department,
    location: row.location,
    employer: row.employer.name,
  };
}

export const hrDirectoryExportAction: EntityBulkAction<HrScopedDirectoryRow> = {
  id: "directory-export",
  label: "Export",
  icon: Download,
  variant: "outline",
  confirm: (selection) => ({
    title: `Export ${selection.ids.length} ${selection.ids.length === 1 ? "person" : "people"}?`,
    description: "The export is recorded in the access log with who took it and how many.",
    confirmLabel: "Export",
  }),
  run: async (selection) => {
    const byEmployer = new Map<string, HrScopedDirectoryRow[]>();
    for (const row of selection.rows) {
      const list = byEmployer.get(row.employer.organizationId) ?? [];
      list.push(row);
      byEmployer.set(row.employer.organizationId, list);
    }
    const exported: HrScopedDirectoryRow[] = [];
    const refused: string[] = [];
    for (const [organizationId, rows] of byEmployer) {
      const logged = await logHrDirectoryExport({
        organizationId,
        employeeIds: rows.map((r) => r.employee_id),
        columns: HR_DIRECTORY_EXPORT_COLUMNS.map((c) => c.key),
      });
      if (logged.ok) exported.push(...rows);
      else refused.push(rows[0].employer.name);
    }
    if (exported.length === 0) {
      throw new Error(`Not exported: ${refused.join(", ")} did not record the export.`);
    }
    const file = csvExportItem(
      exported.map(toRecord),
      "CSV",
      HR_DIRECTORY_EXPORT_COLUMNS.map((c) => ({ key: c.key, header: c.header })),
    ).build?.();
    if (!file) throw new Error("Not exported: the file could not be built.");
    downloadFile(exportFilename("people", file.extension), file.content, file.mime);
    return {
      message:
        refused.length > 0
          ? `Exported ${exported.length}; ${refused.join(", ")} refused the export.`
          : `Exported ${exported.length} ${exported.length === 1 ? "person" : "people"}.`,
      keepSelection: true,
    };
  },
};
