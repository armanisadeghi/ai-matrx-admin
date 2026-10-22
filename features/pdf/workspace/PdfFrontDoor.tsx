"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, EmptyState } from "@ai-matrx/design-system/controls";
import { FileText } from "lucide-react";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import RouteHeader from "@/features/shell/components/header/RouteHeader";

const FilePickerWindow = dynamic(
  () => import("@/features/resource-manager/resource-picker/FilePickerWindow").then((m) => ({ default: m.FilePickerWindow })),
  { ssr: false },
);

export const PDF_FRONT_DOOR_SURFACE_NAME = "matrx-user/pdf-front-door";

/** `/pdf` for a signed-in person: choose a PDF, or scan one with the camera. */
export function PdfFrontDoor() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <SurfaceRuntimeProvider surfaceName={PDF_FRONT_DOOR_SURFACE_NAME} getScope={() => ({})} isEditable={false}>
      <RouteHeader left={<span className="px-2 text-sm font-medium">PDF</span>} />
      <div className="flex h-dvh w-full items-center justify-center pt-[var(--shell-header-h)]">
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
