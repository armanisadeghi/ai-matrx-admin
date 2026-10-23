"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { FileText } from "lucide-react";
import { FileUploadDropzone } from "@ai-matrx/media/react";
import { DropzoneAcquisitionActions } from "@/features/files/components/core/FileAcquisition/DropzoneAcquisitionActions";
import { useFileNode } from "@/features/files/hooks/useFileNode";
import { toast } from "@/lib/toast";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { PdfDocumentList } from "./PdfDocumentList";
import RouteHeader from "@/features/shell/components/header/RouteHeader";

const FilePickerWindow = dynamic(
  () => import("@/features/resource-manager/resource-picker/FilePickerWindow").then((m) => ({ default: m.FilePickerWindow })),
  { ssr: false },
);

/** One just-uploaded PDF: opens in the workspace. */
function UploadedPdf({ fileId }: { fileId: string }) {
  const { file } = useFileNode(fileId);
  return (
    <li>
      <Link href={`/pdf/${fileId}`} className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{file?.fileName ?? "PDF"}</span>
        <span className="shrink-0 text-muted-foreground">Open</span>
      </Link>
    </li>
  );
}

export const PDF_FRONT_DOOR_SURFACE_NAME = "matrx-user/pdf-front-door";

/** `/pdf` for a signed-in person: choose a PDF, or scan one with the camera. */
export function PdfFrontDoor() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);
  // One file goes straight to the workspace; several land in a list, each already opening on its own.
  const onUploaded = (ids: string[]) => {
    if (ids.length === 1) {
      router.push(`/pdf/${ids[0]}`);
      return;
    }
    if (ids.length > 1) setUploaded((cur) => [...ids, ...cur]);
  };
  return (
    <SurfaceRuntimeProvider surfaceName={PDF_FRONT_DOOR_SURFACE_NAME} getScope={() => ({})} isEditable={false}>
      <RouteHeader left={<span className="px-2 text-sm font-medium">PDF</span>} />
      <div className="flex h-dvh w-full flex-col items-center gap-6 overflow-y-auto pb-6 pt-[var(--shell-header-h)]">
        <div className="my-auto flex w-full flex-col items-center gap-6">
        <EmptyState
          icon={<FileText />}
          title="Open a PDF"
          line="Pick one from your files, or scan paper with your camera."
          action={
            <span className="flex gap-2">
              <Button variant="primary" onClick={() => setOpen(true)}>Choose a PDF</Button>
              <Button variant="outline" asChild>
                <Link href="/tools/scanner">Scan</Link>
              </Button>
            </span>
          }
        />
        <FileUploadDropzone
          mode="inline"
          accept={["application/pdf"]}
          uploadOptions={{ visibility: "private" }}
          onUploaded={onUploaded}
          onError={(message) => toast.error(message)}
          onOpenFile={(id) => router.push(`/pdf/${id}`)}
          actions={<DropzoneAcquisitionActions uploadOptions={{ visibility: "private" }} accept="application/pdf" onChooseExisting={() => setOpen(true)} onError={(m) => toast.error(m)} />}
          className="w-full max-w-xl rounded-xl border border-dashed border-border bg-card/40 px-4 py-6"
        >
          <p className="text-center text-sm text-muted-foreground">Drop one or many PDFs here, or click to upload. Each file shows its own progress.</p>
        </FileUploadDropzone>
        {uploaded.length ? (
          <section className="w-full max-w-xl px-4" data-pdf-just-uploaded="">
            <h2 className="mb-1 text-sm font-medium">Just uploaded</h2>
            <ul className="rounded-md border border-border">{uploaded.map((id) => <UploadedPdf key={id} fileId={id} />)}</ul>
          </section>
        ) : null}
        <PdfDocumentList />
        </div>
      </div>
      <FilePickerWindow
        open={open}
        onClose={() => setOpen(false)}
        scopeId="pdf-workspace-open"
        title="Choose a PDF"
        initialFilter="pdfs"
        onPick={(selection) => {
          router.push(`/pdf/${selection.fileId}`);
          return "close";
        }}
      />
    </SurfaceRuntimeProvider>
  );
}
