import { createRouteMetadata } from "@/utils/route-metadata";
import WorkflowEntityLayoutClient from "./WorkflowEntityLayoutClient";

export const metadata = createRouteMetadata("/workflows", {
  titlePrefix: "Entity",
  title: "Workflows",
  description: "Workflow entity management and configuration",
  letter: "WE",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <WorkflowEntityLayoutClient>{children}</WorkflowEntityLayoutClient>;
}
