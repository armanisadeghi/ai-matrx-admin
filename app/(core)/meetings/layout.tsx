import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/meetings", {
  title: "Meetings",
  description:
    "Schedule, manage and join your meetings — recurring series, guests and RSVPs, and the record of every meeting",
  letter: "MG",
  additionalMetadata: {
    keywords: ["meetings", "video call", "conference", "meeting link"],
  },
});

/**
 * No body-level wrapper — the page owns the shell's full-height area, like
 * `(core)/tasks`. `/meetings` is where meetings are MANAGED; the meeting itself
 * lives at `/meet/<slug>` in the chrome-free `(meet)` group, because a stage
 * has no room for `AppShell`.
 */
export default function MeetingsLayout({
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
