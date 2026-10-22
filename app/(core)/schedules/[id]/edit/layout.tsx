import { createDynamicRouteMetadata } from "@/utils/route-metadata";
import { displayId } from "@ai-matrx/design-system/record-id-format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // THE id's own shortening (server-safe); the "…" says the tab title is cut.
  const shown = displayId(id);
  const tabTitle = shown === id ? id : `${shown}…`;
  return createDynamicRouteMetadata("/schedules", {
    titlePrefix: "Edit",
    title: tabTitle,
    description: "Edit a scheduled task.",
    letter: "SE",
  });
}

export default function ScheduleEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
