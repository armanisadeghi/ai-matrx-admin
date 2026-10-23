"use client";

// features/marketing/components/brands/browse/BrandNewPage.tsx
//
// /marketing/brands/new — Add a brand, as a real page. The body is BrandCreatePanel, the same component
// the "Add brand" window panel renders (feature-pages contract, rule 3).

import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import { RecordPageHeader } from "@/features/shell/components/header/templates/RecordPageHeader";
import { createMarketingScope } from "@/features/surfaces/manifests/marketing.manifest";
import { BrandCreatePanel } from "@/features/marketing/components/brands/BrandCreatePanel";
import { marketingRoutes } from "@/features/marketing/lib/routes";

export function BrandNewPage() {
  const router = useRouter();
  const pathname = usePathname();
  // Set once a create or Smart Add door has chosen where to go, so the form's own onClose never overrides it.
  const leaving = useRef(false);
  return (
    <SurfaceRuntimeProvider surfaceName="matrx-user/marketing" getScope={() => createMarketingScope({ hub_view: "brands" })}>
      <RecordPageHeader
        backHref={marketingRoutes.brandsAll()}
        level={{ name: "Add brand" }}
      />
      <div className="h-full overflow-hidden bg-textured pt-[var(--shell-header-h)]">
        <div className="mx-auto h-full w-full max-w-2xl px-4 py-4">
          <BrandCreatePanel
            // Creating a brand opens it (the by-hand path); the handle path navigates itself and then calls
            // onClose from the brand page — only leave /new when we are still on it.
            onCreated={(brand) => {
              leaving.current = true;
              router.push(marketingRoutes.brand(brand.id));
            }}
            onClose={() => {
              if (!leaving.current && pathname === marketingRoutes.brandsNew()) router.push(marketingRoutes.brandsAll());
            }}
          />
        </div>
      </div>
    </SurfaceRuntimeProvider>
  );
}
