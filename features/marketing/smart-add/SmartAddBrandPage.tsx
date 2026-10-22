"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { SmartAddBrand } from "./SmartAddBrand";
import { StageBackdrop } from "./stage/StageBackdrop";
import { SmartAddEnrichFlow } from "./enrich/SmartAddEnrichFlow";
import { useSmartAddAddress } from "./useSmartAddAddress";
import { parseSmartAddDoor, parseValidatePath, validateAddressOwner } from "./smartAddUrl";
import { SmartAddValidatePage } from "./validate/SmartAddValidatePage";

/** Smart Add on the main site, rendered by the /marketing/brands/smart-add layout: /company, /person,
 *  or /enrich/<brand id> (enrich that existing brand; enrich/ENRICH.md in common-docs). URLs: smartAddUrl.ts. */
export function SmartAddBrandPage() {
  const router = useRouter();
  const url = useSmartAddAddress();
  const enrichBrandId = url.address.enrichBrandId;
  // The brand this live session just created: its validate address is the session itself, not a fresh load.
  const [liveBrandId, setLiveBrandId] = useState<string | null>(null);
  // The choice and entry screens fit the frame: no page runway there, so the page never scrolls (Arman, 2026-10-22).
  const [intakeFit, setIntakeFit] = useState(false);
  const pathname = usePathname() ?? "";
  const validateBrandId = parseValidatePath(pathname);
  // The found-first door (/found): the same session, opening on the found grid (after Create it is the same page).
  const door = parseSmartAddDoor(pathname);
  return (
    <>
      <EntityModeHeader backHref={marketingRoutes.brands()} entityLabel={enrichBrandId ? "Enrich with Smart Add" : "Smart Add brand"} actions={[]} />
      {/* The living stage sits behind the scroll owner; it dims once the structured page is up. */}
      <div data-smart-add-host="" className="group relative h-full overflow-hidden bg-background">
        <StageBackdrop />
        {/* ui-exception: the intake stage is one screen, not a page with a last line; the runway returns with the stage that scrolls */}
        <main className="relative h-full overflow-y-auto" data-floating-clearance={intakeFit ? "off" : undefined}>
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
              door={door}
              onIntakeFit={setIntakeFit}
            />
          ) : null}
        </main>
      </div>
    </>
  );
}
