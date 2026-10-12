import React from "react";

import { createRouteMetadata } from "@/utils/route-metadata";
import DocumentsLanding from "@/features/auth/components/module-landing/landings/DocumentsLanding";
import { OfficeLookSeed } from "@/features/file-actions/skin/OfficeLookSeed";
import { getSessionVerdict } from "@/utils/supabase/sessionVerdict";

export const metadata = createRouteMetadata("/documents", {
  title: "Documents",
  description: "Cloud documents with realtime collaboration",
  letter: "DO",
});

/**
 * Server-side auth branch — keeps the `"use client"` documents page
 * (Univer docs engine + service calls) from shipping to guests. Guests see
 * the marketing landing; authed users get the workspace wrapper. Mirrors
 * the workbooks layout — the cloud-document twin of the cloud-workbook surface.
 */
export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user } = await getSessionVerdict();
  if (!isAuthenticated) return <DocumentsLanding />;
  return (
    <OfficeLookSeed userId={user.id}>
      <div className="w-full h-full scrollbar-none">{children}</div>
    </OfficeLookSeed>
  );
}
