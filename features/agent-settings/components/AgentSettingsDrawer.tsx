"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AgentSettingsContent } from "./AgentSettingsContent";

interface AvailableTool {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
}

interface AgentSettingsDrawerProps {
  agentId: string;
  isOpen: boolean;
  onClose: () => void;
  availableTools?: AvailableTool[];
  usedVariableNames?: Set<string>;
  showTools?: boolean;
  showVariables?: boolean;
  showParams?: boolean;
  title?: string;
}

/**
 * Mobile bottom sheet — slides up from the bottom of the screen.
 * Renders the same AgentSettingsContent as the desktop panel.
 * Never use Dialog on mobile — always use this Drawer.
 */
export function AgentSettingsDrawer({
  agentId,
  isOpen,
  onClose,
  availableTools,
  usedVariableNames,
  showTools = true,
  showVariables = true,
  showParams = true,
  title = "Agent Settings",
}: AgentSettingsDrawerProps) {
  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90dvh] flex flex-col">
        <DrawerHeader className="shrink-0 border-b border-border pb-3">
          <DrawerTitle className="text-sm">{title}</DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 overflow-auto pb-safe">
          <AgentSettingsContent
            agentId={agentId}
            availableTools={availableTools}
            usedVariableNames={usedVariableNames}
            showTools={showTools}
            showVariables={showVariables}
            showParams={showParams}
          />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
