"use client";

import { useAppDispatch } from "@/lib/redux/hooks";
import { openAgentSettingsWindow } from "@/lib/redux/slices/overlaySlice";

import { useState } from "react";
import {
  MoreHorizontal,
  FileText,
  History,
  GitBranch,
  SlidersHorizontal,
  Sparkles,
  Maximize2,
  Play,
  Copy,
  AppWindow,
  Database,
  Layers,
  ChevronRight,
  Shield,
  RefreshCw,
  Link2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/toast-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

const INTERFACE_VARIATIONS = [
  "Full Modal",
  "Compact Modal",
  "Inline",
  "Sidebar",
  "Flexible Panel",
  "Background",
  "Toast",
  "Direct",
  "Background Process",
] as const;

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const GENERAL_ITEMS: MenuItem[] = [
  { label: "Edit Agent Info", icon: FileText },
  { label: "View Run History", icon: History },
  { label: "View All Versions", icon: GitBranch },
  { label: "Advanced Settings View", icon: SlidersHorizontal },
  { label: "Matrx Agent Optimizer", icon: Sparkles },
  { label: "Full Screen Editor", icon: Maximize2 },
  { label: "Open Run Modal", icon: Play },
  { label: "Duplicate", icon: Copy },
  { label: "Create App", icon: AppWindow },
  { label: "Add Data Storage Support", icon: Database },
];

const ADMIN_ITEMS: MenuItem[] = [
  { label: "Convert to Template", icon: Shield },
  { label: "Convert/Update System Agent", icon: RefreshCw },
  { label: "Create/Update Shortcut", icon: Link2 },
  { label: "Find Usages", icon: Search },
];

function comingSoon() {
  toast.info("Coming Soon");
}

export function AgentOptionsMenu({ agentId }: { agentId: string }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleDesktopItemClick = (label: string) => {
    if (label === "Advanced Settings View") {
      dispatch(openAgentSettingsWindow({ agentId }));
    } else {
      comingSoon();
    }
  };

  const trigger = (
    <button
      className={cn(
        "flex items-center justify-center w-6 h-6 rounded-md transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted/60",
      )}
    >
      <MoreHorizontal className="w-4 h-4" />
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerTitle className="sr-only">Agent Options</DrawerTitle>
          <MobileMenuContent onClose={() => setOpen(false)} agentId={agentId} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {GENERAL_ITEMS.map(({ label, icon: Icon }) => (
          <DropdownMenuItem key={label} onClick={() => handleDesktopItemClick(label)}>
            <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
            Try Interface Variations
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {INTERFACE_VARIATIONS.map((v) => (
              <DropdownMenuItem key={v} onClick={comingSoon}>
                {v}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Admin Options
        </DropdownMenuLabel>
        {ADMIN_ITEMS.map(({ label, icon: Icon }) => (
          <DropdownMenuItem key={label} onClick={comingSoon}>
            <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileMenuContent({ onClose, agentId }: { onClose: () => void; agentId: string }) {
  const [variationsOpen, setVariationsOpen] = useState(false);
  const dispatch = useAppDispatch();

  const handleItem = (label: string) => {
    if (label === "Advanced Settings View") {
      dispatch(openAgentSettingsWindow({ agentId }));
    } else {
      comingSoon();
    }
    onClose();
  };

  return (
    <div className="flex flex-col overflow-y-auto max-h-[calc(85dvh-2rem)] pb-safe">
      <div className="py-1">
        {GENERAL_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => handleItem(label)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            {label}
          </button>
        ))}

        <button
          onClick={() => setVariationsOpen(!variationsOpen)}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
        >
          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-left">Try Interface Variations</span>
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform",
              variationsOpen && "rotate-90",
            )}
          />
        </button>
        {variationsOpen && (
          <div className="pl-6 bg-muted/20">
            {INTERFACE_VARIATIONS.map((v) => (
              <button
                key={v}
                onClick={handleItem}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground/80 hover:bg-muted/50 active:bg-muted/70 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-px bg-border mx-3 my-1" />

      <div className="px-4 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Admin Options
        </span>
      </div>
      <div className="py-1">
        {ADMIN_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={handleItem}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
