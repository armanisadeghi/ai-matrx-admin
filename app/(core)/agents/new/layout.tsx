import { ReactNode } from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/agents/new", {
  title: "Create New Agent",
  description: "Choose how to create a new AI agent",
});

export default function NewAgentLayout({ children }: { children: ReactNode }) {
  // EVERY CRUMB IS A DOOR: every create path names its levels (Agents › New › <path ▾>); a page with
  // its own header (the studio) wins — this one yields (`fallback`).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
