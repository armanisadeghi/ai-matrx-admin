"use client";

import React from "react";
import { GitBranch } from "lucide-react";
import { PlaceholderPanel } from "../PlaceholderPanel";

interface GitPanelProps {
  className?: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ className }) => (
  <PlaceholderPanel
    title="Source Control"
    icon={GitBranch}
    description="Stage, diff, and commit changes from the active workspace."
    className={className}
  />
);
