import { LoudNoticesDemo } from "@/features/notifications/components/LoudNoticesDemo";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/demos/loud-notices", {
  title: "Loud notices",
  description: "The notification centre's loud state with sample spend alarms.",
});

export default function LoudNoticesDemoPage() {
  return <LoudNoticesDemo />;
}
