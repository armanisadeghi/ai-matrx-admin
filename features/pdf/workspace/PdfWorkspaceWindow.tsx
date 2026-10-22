"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { FileText } from "lucide-react";
import { WindowPanel } from "@ai-matrx/summon/window";
import { PdfWorkspaceBody } from "./PdfWorkspaceRoute";

const FilePickerWindow = dynamic(
  () => import("@/features/resource-manager/resource-picker/FilePickerWindow").then((m) => ({ default: m.FilePickerWindow })),
  { ssr: false },
);

/** The floating window for the PDF workspace: pick a PDF, then work on it in the same window. */
export function PdfWorkspaceWindow({ onClose }: { onClose: () => void }) {
  const [fileId, setFileId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  return (
    <WindowPanel id="pdf-extractor" title="PDF" onClose={onClose} width={980} height={640} minWidth={480} minHeight={360} position="center" overlayId="pdfExtractorWindow" onCollectData={() => ({ history: [], currentIndex: null })}>
      {fileId ? (
        <PdfWorkspaceBody fileId={fileId} surface={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <EmptyState icon={<FileText />} title="Open a PDF" line="Pick one from your files." action={<Button variant="primary" onClick={() => setPicking(true)}>Choose a PDF</Button>} />
        </div>
      )}
      <FilePickerWindow
        open={picking}
        onClose={() => setPicking(false)}
        scopeId="pdf-workspace-window-open"
        title="Choose a PDF"
        initialFilter="pdfs"
        onPick={(selection) => {
          setFileId(selection.fileId);
          return "close";
        }}
      />
    </WindowPanel>
  );
}
