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
import { MenuTapButton } from "@/components/icons/tap-buttons";

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
  soon?: boolean;
}

// Actions scoped to the currently active agent
const THIS_AGENT_ITEMS: MenuItem[] = [
  { label: "Edit Agent Info", icon: FileText },
  { label: "View Run History", icon: History },
  { label: "View Agent Window", icon: AppWindow },
  { label: "Advanced Settings View", icon: SlidersHorizontal, soon: true },
  { label: "View All Versions", icon: GitBranch, soon: true },
  { label: "Full Screen Editor", icon: Maximize2, soon: true },
  { label: "Open Run Modal", icon: Play, soon: true },
  { label: "Matrx Agent Optimizer", icon: Sparkles, soon: true },
];

// Actions that produce something new from this agent
const AGENT_MANAGEMENT_ITEMS: MenuItem[] = [
  { label: "Duplicate", icon: Copy },
  { label: "Convert to Template", icon: Shield },
  { label: "Create App", icon: AppWindow, soon: true },
  { label: "Add Data Storage Support", icon: Database, soon: true },
];

// Global agent actions — not scoped to the current agent
const GLOBAL_AGENT_ITEMS: MenuItem[] = [
  { label: "Import Agent", icon: Upload },
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
  { label: "Convert/Update System Agent", icon: RefreshCw, soon: true },
  { label: "Create/Update Shortcut", icon: Link2, soon: true },
  { label: "Find Usages", icon: Search, soon: true },
];

function comingSoon() {
  toast.info("Coming Soon");
}

function SoonBadge() {
  return (
    <span className="ml-2 text-[10px] font-medium text-muted-foreground/60 bg-muted rounded px-1 py-0.5 leading-none">
      soon
    </span>
  );
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

  const trigger = <MenuTapButton />;

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
      <DropdownMenuContent align="end" className="w-80">
        {/* ── This Agent ── */}
        {THIS_AGENT_ITEMS.map(({ label, icon: Icon, soon }) => (
          <DropdownMenuItem
            key={label}
            onClick={() => handleDesktopItemClick(label)}
            className={cn(soon && "text-muted-foreground")}
          >
            <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            {soon && <SoonBadge />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-muted-foreground">
            <Layers className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="flex-1">Try Interface Variations</span>
            <SoonBadge />
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

        {/* ── Manage This Agent ── */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Manage
        </DropdownMenuLabel>
        {AGENT_MANAGEMENT_ITEMS.map(({ label, icon: Icon, soon }) => {
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
              className={cn(soon && "text-muted-foreground")}
            >
              <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
              <span className="flex-1">{displayLabel}</span>
              {soon && <SoonBadge />}
            </DropdownMenuItem>
          );
        })}

        {/* ── Global (not agent-specific) ── */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Agents
        </DropdownMenuLabel>
        {GLOBAL_AGENT_ITEMS.map(({ label, icon: Icon, soon }) => (
          <DropdownMenuItem
            key={label}
            onClick={() => handleDesktopItemClick(label)}
            className={cn(soon && "text-muted-foreground")}
          >
            <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            {soon && <SoonBadge />}
          </DropdownMenuItem>
        ))}

        {/* ── Admin ── */}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Admin
        </DropdownMenuLabel>
        {ADMIN_ITEMS.map(({ label, icon: Icon }) => (
          <DropdownMenuItem
            key={label}
            onClick={comingSoon}
            className="text-muted-foreground"
          >
            <Icon className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="flex-1">{label}</span>
            <SoonBadge />
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
      {/* ── This Agent ── */}
      <div className="py-1">
        {THIS_AGENT_ITEMS.map(({ label, icon: Icon, soon }) => (
          <button
            key={label}
            onClick={() => handleItem(label)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted/50 active:bg-muted/70 transition-colors",
              soon ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {soon && <SoonBadge />}
          </button>
        ))}

        <button
          onClick={() => setVariationsOpen(!variationsOpen)}
          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
        >
          <Layers className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="flex-1 text-left">Try Interface Variations</span>
          <SoonBadge />
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground transition-transform ml-1",
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

      {/* ── Open in New Tab ── */}
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

      {/* ── Manage This Agent ── */}
      <div className="h-px bg-border mx-3 my-1" />
      <div className="px-4 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Manage
        </span>
      </div>
      <div className="py-1">
        {AGENT_MANAGEMENT_ITEMS.map(({ label, icon: Icon, soon }) => (
          <button
            key={label}
            onClick={() => handleItem(label)}
            disabled={
              isBusy &&
              (label === "Duplicate" || label === "Convert to Template")
            }
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted/50 active:bg-muted/70 transition-colors",
              soon ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {soon && <SoonBadge />}
          </button>
        ))}
      </div>

      {/* ── Agents (global) ── */}
      <div className="h-px bg-border mx-3 my-1" />
      <div className="px-4 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Agents
        </span>
      </div>
      <div className="py-1">
        {GLOBAL_AGENT_ITEMS.map(({ label, icon: Icon, soon }) => (
          <button
            key={label}
            onClick={() => handleItem(label)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted/50 active:bg-muted/70 transition-colors",
              soon ? "text-muted-foreground" : "text-foreground",
            )}
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {soon && <SoonBadge />}
          </button>
        ))}
      </div>

      {/* ── Admin ── */}
      <div className="h-px bg-border mx-3 my-1" />
      <div className="px-4 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
          Admin
        </span>
      </div>
      <div className="py-1">
        {ADMIN_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => handleItem(label)}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 active:bg-muted/70 transition-colors"
          >
            <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            <SoonBadge />
          </button>
        ))}
      </div>
    </div>
  );
}
