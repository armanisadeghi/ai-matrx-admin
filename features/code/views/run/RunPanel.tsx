"use client";

import React from "react";
import { Play } from "lucide-react";
import { PlaceholderPanel } from "../PlaceholderPanel";

interface RunPanelProps {
  className?: string;
}

export const RunPanel: React.FC<RunPanelProps> = ({ className }) => (
  <PlaceholderPanel
    title="Run and Debug"
    icon={Play}
    description="Launch configurations, breakpoints, and watch expressions will live here."
    className={className}
  />
);
