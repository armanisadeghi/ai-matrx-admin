"use client";

/**
 * TemplateSelector — front door for the message-templates picker UI.
 *
 * The heavy impl (TemplateBrowserModal, SaveTemplateModal, template services)
 * lives in `TemplateSelectorImpl.tsx`. This shell renders a lightweight icon
 * trigger and only dynamic-imports the impl after the user clicks it.
 *
 * Callsites import THIS module, never `TemplateSelectorImpl` directly.
 * See the code-splitting skill (Method B + click gate).
 */

import { useState } from "react";
import { FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "@ai-matrx/design-system/controls";
import type { MessageRole } from "@/features/message-templates/types/message-templates-db";

export interface TemplateSelectorProps {
  role: MessageRole;
  currentContent: string;
  onTemplateSelected: (content: string) => void;
  onSaveTemplate?: (label: string, content: string, tags: string[]) => void;
  messageIndex?: number;
}

function TemplateSelectorTrigger({
  disabled,
  onActivate,
}: {
  disabled?: boolean;
  onActivate?: () => void;
}) {
  return (
    <Button
      variant="quiet"
      icon={<FileText />}
      aria-label="Templates"
      disabled={disabled}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onActivate?.();
      }}
    />
  );
}

const TemplateSelectorImpl = dynamic(
  () => import("./TemplateSelectorImpl").then((m) => m.TemplateSelectorImpl),
  {
    ssr: false,
    loading: () => <TemplateSelectorTrigger disabled />,
  },
);

export function TemplateSelector(props: TemplateSelectorProps) {
  const [activated, setActivated] = useState(false);

  if (!activated) {
    return <TemplateSelectorTrigger onActivate={() => setActivated(true)} />;
  }

  return <TemplateSelectorImpl {...props} initialOpen />;
}
