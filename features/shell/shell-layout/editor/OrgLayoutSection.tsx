"use client";

// Organization settings › Layout (custom-experience PLAN §1.3): an owner or admin sets the sidebar, header
// and dock every member starts from, and whether members may use their own (knob
// `shell.members_may_customize`). Opens the same editor window with the organization as its target.
import { PanelLeft, PanelTop, Smartphone } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useOpenShellLayoutEditor } from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";
import { MembersMayCustomize } from "./ShellLayoutEditor";

export function OrgLayoutSection({ organizationId }: { organizationId: string }) {
  const open = useOpenShellLayoutEditor();
  const edit = (region: "sidebar" | "header" | "dock") => open({ region, target: "organization", organizationId });
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" icon={<PanelLeft />} onClick={() => edit("sidebar")}>
          Edit sidebar…
        </Button>
        <Button variant="outline" icon={<PanelTop />} onClick={() => edit("header")}>
          Customize header…
        </Button>
        <Button variant="outline" icon={<Smartphone />} onClick={() => edit("dock")}>
          Customize dock…
        </Button>
      </div>
      <MembersMayCustomize organizationId={organizationId} />
    </div>
  );
}
