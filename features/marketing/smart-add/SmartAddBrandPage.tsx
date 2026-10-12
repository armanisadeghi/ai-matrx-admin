"use client";

import { useRouter } from "next/navigation";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { SmartAddBrand } from "./SmartAddBrand";
import { StageBackdrop } from "./stage/StageBackdrop";

/** Smart Add on the main site: /marketing/brands/smart-add (the brands list's "Add brand" offers it first). */
export function SmartAddBrandPage() {
  const router = useRouter();
  return (
    <>
      <EntityModeHeader backHref={marketingRoutes.brands()} entityLabel="Smart Add brand" actions={[]} />
      {/* The living stage sits behind the scroll owner; it dims once the structured page is up. */}
      <div className="group relative h-full overflow-hidden bg-textured">
        <StageBackdrop />
        <main className="relative h-full overflow-y-auto">
          <SmartAddBrand onCreated={() => router.refresh()} />
        </main>
      </div>
    </>
  );
}
