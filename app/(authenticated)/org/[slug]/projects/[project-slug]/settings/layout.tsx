import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { OrgProjectSettingsLayoutClient } from "./OrgProjectSettingsLayoutClient";

export const metadata = createRouteMetadata("/projects", {
  titlePrefix: "Org Settings",
  title: "Projects",
  description:
    "Organization project settings: team, visibility, and integrations",
  letter: "Os",
});

export default function OrgProjectSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OrgProjectSettingsLayoutClient>{children}</OrgProjectSettingsLayoutClient>
  );
}
