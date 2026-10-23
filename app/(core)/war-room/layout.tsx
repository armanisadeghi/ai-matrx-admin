import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/war-room", {
  title: "War Room",
  description:
    "Session-based multitask command center — tiles for tasks, notes, audio, and agents.",
  letter: "WR",
});

export default function WarRoomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Every page here names its levels through the derived trail; a page with its own header draws it
  // and this steps aside (crumb doors, features/shell/FEATURE.md § Every crumb is a door).
  return (
    <>
      <DerivedCrumbTrailHeader fallback />
      {children}
    </>
  );
}
