"use client";

/**
 * One Data library source as a floating window (phone: full screen). The body IS the library's
 * `SourceDetail` — the same component wherever a source opens; this file only frames it.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { WindowPanel } from "@/features/window-panels/WindowPanel";
import { SourceDetail } from "@/features/data-sources/library/SourceDetail";
import { useLibrary, useLibraryOrganizationId } from "@/features/data-sources/library/hooks";

const OVERLAY_ID = "dataSourceWindow";

export default function DataSourceWindow({ isOpen, onClose, sourceKey, initialValues }: { isOpen: boolean; onClose: () => void; sourceKey: string; initialValues?: Record<string, string> }) {
  const library = useLibrary(useLibraryOrganizationId());
  // The window gets out of the way once the person has gone somewhere else (Open table): it would
  // otherwise float over the toolbar of the page they just opened.
  const pathname = usePathname();
  const openedOn = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      openedOn.current = null;
      return;
    }
    if (openedOn.current === null) openedOn.current = pathname;
    else if (pathname !== openedOn.current) onClose();
  }, [isOpen, pathname, onClose]);
  if (!isOpen) return null;
  const label = library.data?.sources.find((s) => s.key === sourceKey)?.label ?? "Data source";
  return (
    <WindowPanel
      id="data-source-window"
      overlayId={OVERLAY_ID}
      title={label}
      width={560}
      height="82dvh"
      position="top-right"
      minWidth={380}
      minHeight={420}
      onClose={onClose}
      bodyClassName="overflow-y-auto"
    >
      <SourceDetail sourceKey={sourceKey} initialValues={initialValues} />
    </WindowPanel>
  );
}
