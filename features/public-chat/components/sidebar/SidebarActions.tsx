"use client";

import {
  Zap,
  FolderKanban,
  Image,
  Video,
  AudioLines,
  ChevronRight,
  Building,
  ListCheck,
  FileText,
  BriefcaseBusiness,
  Scale,
  Blocks,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// PLACEHOLDER DROPDOWN ROW
// ============================================================================

function PlaceholderDropdownRow({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-md text-foreground/80 hover:bg-accent/50 hover:text-foreground transition-colors text-left group">
          <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
          <span className="text-xs flex-1">{label}</span>
          <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="right"
        sideOffset={8}
        className="w-44"
      >
        <DropdownMenuItem
          disabled
          className="text-[11px] text-muted-foreground"
        >
          Coming soon
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// DIRECT CONTEXT SELECTION
// ============================================================================

export function DirectContextSelection() {
  return (
    <div className="px-1.5 py-1">
      {/* Context Setting Dropdowns */}
      <PlaceholderDropdownRow icon={Building} label="Organization" />
      <PlaceholderDropdownRow icon={BriefcaseBusiness} label="Custom Scope 1" />
      <PlaceholderDropdownRow icon={Scale} label="Custom Scope 2" />
      <PlaceholderDropdownRow icon={Blocks} label="Custom Scope 3" />
      <PlaceholderDropdownRow icon={FolderKanban} label="Project" />
      <PlaceholderDropdownRow icon={ListCheck} label="Tasks" />
    </div>
  );
}

export default DirectContextSelection;
