"use client";

import React from "react";
import { Blocks } from "lucide-react";
import { PlaceholderPanel } from "../PlaceholderPanel";

interface ExtensionsPanelProps {
  className?: string;
}

export const ExtensionsPanel: React.FC<ExtensionsPanelProps> = ({
  className,
}) => (
  <PlaceholderPanel
    title="Extensions"
    icon={Blocks}
    description="Matrx extensions and agent add-ons will be browsable from here."
    className={className}
  />
);
