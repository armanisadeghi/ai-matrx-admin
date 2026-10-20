"use client";

import { WindowPanel } from "@ai-matrx/summon/window";
import { NonEditableContextMenu } from "@ai-matrx/context-menu/react";
import { ShellLayoutEditor, type ShellLayoutTargetKind } from "@/features/shell/shell-layout/editor/ShellLayoutEditor";
import { ShellLayoutMount } from "@/features/shell/shell-layout/editor/ShellLayoutMount";
import type { EditorRegion } from "@/features/shell/shell-layout/editor/regions";

interface ShellLayoutEditorWindowProps {
  onClose: () => void;
  target: ShellLayoutTargetKind;
  region: EditorRegion;
  organizationId: string | null;
}

const TITLE: Record<EditorRegion, string> = { sidebar: "Edit sidebar", header: "Customize header", dock: "Customize dock", look: "Choose a look" };

/** "Edit sidebar…" / "Customize header…" / "Customize dock…" — the layout editor in a window (phone: full height). */
export default function ShellLayoutEditorWindow({ onClose, target, region, organizationId }: ShellLayoutEditorWindowProps) {
  return (
    <WindowPanel
      title={target === "organization" ? `${TITLE[region]} · Organization` : TITLE[region]}
      id="shell-layout-editor-window"
      overlayId="shellLayoutEditorWindow"
      minWidth={520}
      minHeight={420}
      width={760}
      height={640}
      position="center"
      onClose={onClose}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
    >
      {/* A WINDOW MOUNTS ITS OWN MENU: this is a menu editor (checkboxes + rows with their own ⋯ menus). */}
      <NonEditableContextMenu sourceFeature="system" contentSource={{ type: "raw" }}>
        <ShellLayoutMount organizationId={target === "organization" ? organizationId : null}>
          <ShellLayoutEditor key={`${target}:${organizationId ?? ""}`} target={target} initialRegion={region} />
        </ShellLayoutMount>
      </NonEditableContextMenu>
    </WindowPanel>
  );
}
