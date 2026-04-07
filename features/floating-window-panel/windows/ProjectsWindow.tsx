"use client";

import React from "react";
import { WindowPanel } from "@/features/floating-window-panel/WindowPanel";
import { ProjectsWorkspace } from "@/features/projects/components/ProjectsWorkspace";

interface ProjectsWindowProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectsWindow({ isOpen, onClose }: ProjectsWindowProps) {
  if (!isOpen) return null;

  return (
    <WindowPanel
      title="Projects"
      onClose={onClose}
      position="center"
      width={320}
      height={500}
      minWidth={280}
      maxWidth={600}
    >
      <ProjectsWorkspace />
    </WindowPanel>
  );
}
