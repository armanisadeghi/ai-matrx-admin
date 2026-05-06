"use client";

import { BrowseImageProvider } from "@/features/image-manager/browse/BrowseImageProvider";
import { PublicImagesSection } from "@/features/image-manager/components/PublicImagesSection";

export function SearchPageShell() {
  return (
    <BrowseImageProvider>
      <div className="h-[calc(100dvh-var(--header-height))] overflow-hidden bg-textured">
        <PublicImagesSection />
      </div>
    </BrowseImageProvider>
  );
}
