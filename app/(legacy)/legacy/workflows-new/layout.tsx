import { createRouteMetadata } from "@/utils/route-metadata";
import WorkflowsNewLayoutClient from "./WorkflowsNewLayoutClient";

export const metadata = createRouteMetadata("/workflows", {
  titlePrefix: "New",
  title: "Workflows",
  description: "Design workflows with the next-gen XYFlow editor",
  letter: "Wn",
});

export default function WorkflowsNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkflowsNewLayoutClient>{children}</WorkflowsNewLayoutClient>;
}
