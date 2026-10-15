"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { SmartAddBrand } from "./SmartAddBrand";
import { StageBackdrop } from "./stage/StageBackdrop";
import { SmartAddEnrichFlow } from "./enrich/SmartAddEnrichFlow";
import { useSmartAddAddress } from "./useSmartAddAddress";
import { parseValidatePath, validateAddressOwner } from "./smartAddUrl";
import { SmartAddValidatePage } from "./validate/SmartAddValidatePage";

/** Smart Add on the main site, rendered by the /marketing/brands/smart-add layout: /company, /person,
 *  or /enrich/<brand id> (enrich that existing brand; enrich/ENRICH.md in common-docs). URLs: smartAddUrl.ts. */
export function SmartAddBrandPage() {
  const router = useRouter();
  const url = useSmartAddAddress();
  const enrichBrandId = url.address.enrichBrandId;
  // The brand this live session just created: its validate address is the session itself, not a fresh load.
  const [liveBrandId, setLiveBrandId] = useState<string | null>(null);
  const validateBrandId = parseValidatePath(usePathname() ?? "");
  return (
    <>
      <EntityModeHeader backHref={marketingRoutes.brands()} entityLabel={enrichBrandId ? "Enrich with Smart Add" : "Smart Add brand"} actions={[]} />
      {/* The living stage sits behind the scroll owner; it dims once the structured page is up. */}
      <div className="group relative h-full overflow-hidden bg-background">
        <StageBackdrop />
        <main className="relative h-full overflow-y-auto">
          {validateBrandId && validateAddressOwner(validateBrandId, liveBrandId) === "saved" ? (
            <SmartAddValidatePage key={validateBrandId} brandId={validateBrandId} />
          ) : enrichBrandId ? (
            <SmartAddEnrichFlow key={enrichBrandId} brandId={enrichBrandId} carry={url.address.prefill} onChanged={() => router.refresh()} />
          ) : url.address.mode || validateAddressOwner(validateBrandId, liveBrandId) === "live" ? (
            <SmartAddBrand
              onValidating={(brand) => {
                setLiveBrandId(brand.id);
                url.toValidate(brand.id);
              }}
              url={url}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
