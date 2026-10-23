"use client";

// The /pdf/[fileId] record header. EVERY CRUMB IS A DOOR (features/shell/FEATURE.md): the PDF crumb
// opens the person's other PDFs — the SAME list the "Choose a PDF" picker shows (the cloud-files
// tree, `matchesFileFilter(…, "pdfs")`, system files hidden, newest first), capped like every door.
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { useCloudTree } from "@/features/files/hooks/useCloudTree";
import { selectAllFilesMap } from "@/features/files/redux/selectors";
import { pdfSiblings } from "./pdfSiblings";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";

export function PdfRecordHeader({ fileId, fileName }: { fileId: string; fileName: string }) {
  const userId = useAppSelector(selectUserId);
  useCloudTree(userId);
  const filesById = useAppSelector(selectAllFilesMap);
  return (
    <RecordPageHeader
      backHref="/pdf"
      parents={[{ label: "PDF", href: "/pdf" }]}
      record={{ name: fileName, token: "file", id: fileId, siblings: pdfSiblings(Object.values(filesById), fileId) }}
    />
  );
}
