import React from "react";

import { createRouteMetadata } from "@/utils/route-metadata";
import WorkbooksLanding from "@/features/auth/components/module-landing/landings/WorkbooksLanding";
import { OfficeLookSeed } from "@/features/file-actions/skin/OfficeLookSeed";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export const metadata = createRouteMetadata("/workbooks", {
  title: "Workbooks",
  description: "Lossless spreadsheet workbooks",
  letter: "WB",
});

/**
 * Server-side auth branch — keeps the `"use client"` workbooks page
 * (Univer engine + spreadsheet runtime + service calls) from shipping
 * to guests. Guests see the marketing landing; authed users get the
 * existing background-styled workspace wrapper.
 */
export default async function WorkbooksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = await getSessionVerdict();
  if (!isAuthenticated) return <WorkbooksLanding />;
  return (
    <OfficeLookSeed userId={user.id}>
      <div className="w-full h-full bg-background text-foreground scrollbar-none">
        {children}
      </div>
    </OfficeLookSeed>
  );
}
