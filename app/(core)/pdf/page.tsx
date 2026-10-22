// The PDF front door: choose a PDF (or scan one) and the workspace opens on it.
import type { Metadata } from "next";
import { PdfFrontDoor } from "@/features/pdf/workspace/PdfFrontDoor";

export const metadata: Metadata = { title: "PDF" };

export default function Page() {
  return <PdfFrontDoor />;
}
