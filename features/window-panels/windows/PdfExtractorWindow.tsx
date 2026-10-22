"use client";

import { PdfWorkspaceWindow } from "@/features/pdf/workspace/PdfWorkspaceWindow";

interface PdfExtractorWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Thin shell: the floating PDF window is the PDF workspace (features/pdf/workspace). */
export default function PdfExtractorWindow({ isOpen, onClose }: PdfExtractorWindowProps) {
  if (!isOpen) return null;
  return <PdfWorkspaceWindow onClose={onClose} />;
}
