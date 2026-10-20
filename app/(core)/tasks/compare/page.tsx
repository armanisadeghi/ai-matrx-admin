// Every screen that shows or edits one task, side by side on the same task, so
// they can be compared before any is retired. See ./_client.tsx.
import { createRouteMetadata } from "@/utils/route-metadata";
import TaskSurfaceCompare from "./_client";

export const metadata = createRouteMetadata("/tasks/compare", {
  title: "Task screens side by side",
  description: "Every screen that shows or edits one task, on the same real task.",
});

export default function TaskSurfaceComparePage() {
  return <TaskSurfaceCompare />;
}
