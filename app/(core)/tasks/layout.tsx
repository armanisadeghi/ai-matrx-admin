import { createRouteMetadata } from "@/utils/route-metadata";
import { DerivedCrumbTrailHeader } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";

export const metadata = createRouteMetadata("/tasks", {
  title: "Tasks",
  description:
    "Manage your tasks and projects efficiently with our powerful task management system",
  letter: "T",
  additionalMetadata: {
    keywords: [
      "tasks",
      "task management",
      "projects",
      "productivity",
      "todo",
      "checklist",
    ],
  },
});

/**
 * No body-level wrapper — the page itself uses the shell's full-height area
 * (per the agents/[id]/build pattern). Adding `h-page`, `bg-textured`, or any
 * extra padding here forces every panel below the transparent shell header
 * and creates the boxed look the design rejects.
 */
export default function TasksLayout({
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
