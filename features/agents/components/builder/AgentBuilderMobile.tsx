"use client";

import { useState } from "react";
import { AgentBuilderLeftPanel } from "./AgentBuilderLeftPanel";
import { AgentBuilderRightPanel } from "./AgentBuilderRightPanel";
import { cn } from "@/lib/utils";
import type { DatabaseTool } from "@/utils/supabase/tools-service";

interface AgentBuilderMobileProps {
  agentId: string;
  availableTools?: DatabaseTool[];
}

type MobileTab = "build" | "test";

export function AgentBuilderMobile({
  agentId,
  availableTools = [],
}: AgentBuilderMobileProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("build");

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher */}
      <div className="flex border-b border-border bg-background shrink-0">
        {(["build", "test"] as MobileTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors capitalize border-b-2 -mb-px",
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "build" ? "Build" : "Test"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "build" ? (
          <div className="h-full overflow-y-auto p-4">
            <AgentBuilderLeftPanel
              agentId={agentId}
              availableTools={availableTools}
            />
          </div>
        ) : (
          <AgentBuilderRightPanel agentId={agentId} />
        )}
      </div>
    </div>
  );
}
