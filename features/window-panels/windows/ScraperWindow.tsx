"use client";

import { ScraperFloatingWorkspace } from "@/features/scraper/parts/ScraperFloatingWorkspace";

interface ScraperWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Thin shell: floating window chrome is provided by {@link ScraperFloatingWorkspace}
 * in `features/scraper` so scraper logic stays in the scraper feature.
 */
export default function ScraperWindow({ isOpen, onClose }: ScraperWindowProps) {
  if (!isOpen) return null;
  return <ScraperFloatingWorkspace onClose={onClose} />;
}
