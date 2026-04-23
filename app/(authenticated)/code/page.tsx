import type { Metadata } from "next";
import { CodeWorkspaceRoute } from "@/features/code";

export const metadata: Metadata = {
  title: "Code Workspace",
  description:
    "VSCode-style workspace for editing sandbox files and cloud-hosted projects.",
};

export default function CodeWorkspacePage() {
  return <CodeWorkspaceRoute />;
}
