"use client";

import { useAppDispatch } from "@/lib/redux/hooks";
import {
  openAgentSettingsWindow,
  openAgentRunHistoryWindow,
  openAgentImportWindow,
  openAgentContentWindow,
} from "@/lib/redux/slices/overlaySlice";
import { duplicateAgent } from "@/features/agents/redux/agent-definition/thunks";

import { useState } from "react";
import Link from "next/link";
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
  Upload,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/lib/toast-service";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { TapTargetButton } from "@/components/icons/TapTargetButton";
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
  { label: "View Agent Window", icon: AppWindow },
  { label: "View All Versions", icon: GitBranch },
  { label: "Advanced Settings View", icon: SlidersHorizontal },
  { label: "Matrx Agent Optimizer", icon: Sparkles },
  { label: "Full Screen Editor", icon: Maximize2 },
  { label: "Open Run Modal", icon: Play },
  { label: "Duplicate", icon: Copy },
  { label: "Import Agent", icon: Upload },
  { label: "Convert to Template", icon: Shield },
  { label: "Create App", icon: AppWindow },
  { label: "Add Data Storage Support", icon: Database },
];

// Items that can be opened in a new tab (have navigatable URLs)
const NEW_TAB_ITEMS: {
  label: string;
  icon: typeof ExternalLink;
  getHref: (agentId: string) => string;
}[] = [
  { label: "View Agent", icon: ExternalLink, getHref: (id) => `/agents/${id}` },
  {
    label: "Build Agent",
    icon: ExternalLink,
    getHref: (id) => `/agents/${id}/build`,
  },
  {
    label: "Run Agent",
    icon: ExternalLink,
    getHref: (id) => `/agents/${id}/run`,
  },
  {
    label: "View Versions",
    icon: ExternalLink,
    getHref: (id) => `/agents/${id}/latest`,
  },
];

const ADMIN_ITEMS: MenuItem[] = [
  { label: "Convert/Update System Agent", icon: RefreshCw },
  { label: "Create/Update Shortcut", icon: Link2 },
  { label: "Find Usages", icon: Search },
];

function comingSoon() {
  toast.info("Coming Soon");
}

async function convertToTemplate(agentId: string): Promise<void> {
  const response = await fetch(`/api/agents/${agentId}/convert-to-template`, {
    method: "POST",
  });
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(
      data.details ? `${data.error}: ${data.details}` : data.error || "Failed",
    );
  }
  const data = await response.json();
  toast.success(data.message ?? "Saved as template!");
}

export function AgentOptionsMenu({
  agentId,
  asTapTarget,
}: {
  agentId: string;
  asTapTarget?: boolean;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const dispatch = useAppDispatch();

  const handleDesktopItemClick = async (label: string) => {
    if (label === "Edit Agent Info") {
      dispatch(openAgentSettingsWindow({ agentId }));
      setOpen(false);
    } else if (label === "View Run History") {
      dispatch(openAgentRunHistoryWindow({ agentId }));
      setOpen(false);
    } else if (label === "View Agent Window") {
      dispatch(openAgentContentWindow({ agentId }));
      setOpen(false);
    } else if (label === "Import Agent") {
      dispatch(openAgentImportWindow());
      setOpen(false);
    } else if (label === "Duplicate") {
      setIsDuplicating(true);
      try {
        await dispatch(duplicateAgent(agentId)).unwrap();
        toast.success("Agent duplicated!");
      } catch {
        toast.error("Failed to duplicate agent.");
      } finally {
        setIsDuplicating(false);
        setOpen(false);
      }
    } else if (label === "Convert to Template") {
      setIsConverting(true);
      try {
        await convertToTemplate(agentId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save as template",
        );
      } finally {
        setIsConverting(false);
        setOpen(false);
      }
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
        {asTapTarget ? (
          <TapTargetButton
            icon={<MoreHorizontal className="w-4 h-4" />}
            ariaLabel="Agent options"
            onClick={() => setOpen(true)}
          />
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
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
        {GENERAL_ITEMS.map(({ label, icon: Icon }) => {
          const isLoading =
            (label === "Convert to Template" && isConverting) ||
            (label === "Duplicate" && isDuplicating);
          const displayLabel =
            label === "Convert to Template" && isConverting
              ? "Saving..."
              : label === "Duplicate" && isDuplicating
                ? "Duplicating..."
                : label;
          return (
            <DropdownMenuItem
              key={label}
              disabled={isLoading}
              onClick={() => handleDesktopItemClick(label)}
            >
              <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
              {displayLabel}
            </DropdownMenuItem>
          );
        })}

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

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ExternalLink className="w-4 h-4 mr-2 text-muted-foreground" />
            Open in New Tab
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44">
            {NEW_TAB_ITEMS.map(({ label, icon: Icon, getHref }) => (
              <DropdownMenuItem key={label} asChild>
                <Link
                  href={getHref(agentId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  {label}
                </Link>
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

function MobileMenuContent({
  onClose,
  agentId,
}: {
  onClose: () => void;
  agentId: string;
}) {
  const [variationsOpen, setVariationsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const dispatch = useAppDispatch();

  const handleItem = async (label: string) => {
    if (label === "Edit Agent Info") {
      dispatch(openAgentSettingsWindow({ agentId }));
      onClose();
    } else if (label === "View Run History") {
      dispatch(openAgentRunHistoryWindow({ agentId }));
      onClose();
    } else if (label === "View Agent Window") {
      dispatch(openAgentContentWindow({ agentId }));
      onClose();
    } else if (label === "Import Agent") {
      dispatch(openAgentImportWindow());
      onClose();
    } else if (label === "Duplicate") {
      setIsBusy(true);
      try {
        await dispatch(duplicateAgent(agentId)).unwrap();
        toast.success("Agent duplicated!");
      } catch {
        toast.error("Failed to duplicate agent.");
      } finally {
        setIsBusy(false);
        onClose();
      }
    } else if (label === "Convert to Template") {
      setIsBusy(true);
      try {
        await convertToTemplate(agentId);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save as template",
        );
      } finally {
        setIsBusy(false);
        onClose();
      }
    } else {
      comingSoon();
      onClose();
    }
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
                onClick={() => handleItem(v)}
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
          Open in New Tab
        </span>
      </div>
      <div className="py-1">
        {NEW_TAB_ITEMS.map(({ label, icon: Icon, getHref }) => (
          <Link
            key={label}
            href={getHref(agentId)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            {label}
          </Link>
        ))}
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
            onClick={() => handleItem(label)}
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
