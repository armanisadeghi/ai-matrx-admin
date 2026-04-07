"use client";

import { PdfExtractorFloatingWorkspace } from "@/features/pdf-extractor/components/PdfExtractorWorkspace";

interface PdfExtractorWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Thin shell: floating window chrome + state is provided by PdfExtractorFloatingWorkspace
 * in `features/pdf-extractor` so PDF logic stays in the pdf-extractor feature.
 */
export default function PdfExtractorWindow({
  isOpen,
  onClose,
}: PdfExtractorWindowProps) {
  if (!isOpen) return null;
  return <PdfExtractorFloatingWorkspace onClose={onClose} />;
}
