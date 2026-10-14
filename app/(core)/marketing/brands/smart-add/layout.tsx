import type { ReactNode } from "react";
import { SmartAddBrandPage } from "@/features/marketing/smart-add/SmartAddBrandPage";

export const metadata = { title: "Smart Add brand" };

/**
 * Smart Add lives in the LAYOUT so its session survives moving between /company, /person and back
 * (a layout keeps its state across sibling routes; the pages only name the address). URLs: smartAddUrl.ts.
 */
export default function SmartAddLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SmartAddBrandPage />
      {children}
    </>
  );
}
