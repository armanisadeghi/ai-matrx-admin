// The other PDFs a PDF record's crumb opens (/pdf/[fileId]): the "Choose a PDF" picker's own list —
// the cloud-files tree filtered to PDFs, system files hidden, newest first, capped like every door.
import { isListedFile } from "@/features/files/utils/user-visible";
import { matchesFileFilter, sortFiles } from "@/features/resource-manager/resource-picker/filesPickerLists";
import { SIBLINGS_MAX } from "@/features/shell/breadcrumbs/record-siblings";
import type { CrumbOption } from "@/features/shell/components/header/templates/CrumbTrailHeader";
import type { CloudFileRecord } from "@/features/files/types";

/** The other PDFs a PDF's crumb opens, newest first, capped. */
export function pdfSiblings(files: readonly (CloudFileRecord | undefined)[], currentId: string): CrumbOption[] {
  const pdfs = files.filter((f): f is CloudFileRecord => f != null && isListedFile(f, false) && matchesFileFilter(f, "pdfs"));
  return sortFiles(pdfs, "updated")
    .slice(0, SIBLINGS_MAX)
    .map((f) => ({ label: f.fileName, href: `/pdf/${f.id}`, active: f.id === currentId }));
}

