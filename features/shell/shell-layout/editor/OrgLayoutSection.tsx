"use client";

// Organization settings › Layout (custom-experience PLAN §1.3): an owner or admin sets the sidebar, header
// and dock every member starts from, the organization's look and brand color (members without an accent
// of their own wear it), and whether members may use their own (knob
// `shell.members_may_customize`). Opens the same editor window with the organization as its target.
import { useEffect, useState } from "react";
import { Archive, Palette, PanelLeft, PanelTop, Smartphone } from "lucide-react";
import { Button } from "@ai-matrx/design-system/controls";
import { useOpenShellLayoutEditor } from "@/features/overlays/definitions/shellLayoutEditorWindow.overlay";
import { organizationArchiveState } from "@/features/organizations/service/organizationArchive";
import { MembersMayCustomize } from "./ShellLayoutEditor";

export function OrgLayoutSection({ organizationId }: { organizationId: string }) {
  const open = useOpenShellLayoutEditor();
  const edit = (region: "sidebar" | "header" | "dock" | "look") => open({ region, target: "organization", organizationId });
  // An archived organization's layout cannot be saved (the store refuses every write there), so no editor
  // is offered for it: the page's own archived banner carries Restore.
  const [archived, setArchived] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void organizationArchiveState(organizationId).then((state) => live && setArchived(state?.archived === true));
    return () => {
      live = false;
    };
  }, [organizationId]);
  if (archived) {
    return (
      <p className="flex items-center gap-1.5 type-secondary text-muted-foreground">
        <Archive className="h-3.5 w-3.5" aria-hidden /> Restore this organization to change its layout
      </p>
    );
  }
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
        <Button variant="outline" icon={<Palette />} onClick={() => edit("look")}>
          Look and brand color…
        </Button>
      </div>
      <MembersMayCustomize organizationId={organizationId} />
    </div>
  );
}
