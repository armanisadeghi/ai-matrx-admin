import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";
import WorkflowsLayoutClient from "./WorkflowsLayoutClient";

export const metadata = createRouteMetadata("/workflows", {
    title: "Workflows",
    description: "Design and automate complex workflows",
});

export default function WorkflowsLayout({ children }: { children: React.ReactNode }) {
    return <WorkflowsLayoutClient>{children}</WorkflowsLayoutClient>;
}
