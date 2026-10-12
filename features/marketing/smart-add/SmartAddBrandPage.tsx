"use client";

import { useRouter } from "next/navigation";
import { EntityModeHeader } from "@/features/shell/components/header/templates/EntityModeHeader";
import { marketingRoutes } from "@/features/marketing/lib/routes";
import { SmartAddBrand } from "./SmartAddBrand";

/** Smart Add on the main site: /marketing/brands/smart-add (the brands list's "Add brand" offers it first). */
export function SmartAddBrandPage() {
  const router = useRouter();
  return (
    <>
      <EntityModeHeader backHref={marketingRoutes.brands()} entityLabel="Smart Add brand" actions={[]} />
      <main className="h-full overflow-y-auto bg-textured px-4 pb-8 pt-[calc(var(--shell-header-h)+1rem)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          <SmartAddBrand onCreated={() => router.refresh()} />
        </div>
      </main>
    </>
  );
}
