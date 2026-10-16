"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeatureKnobsPanel } from "@/features/admin/limits/components/FeatureKnobsPanel";
import { AccountsPanel } from "./AccountsPanel";
import { ToolDetail } from "./ToolDetail";
import { ToolsTable } from "./ToolsTable";

/**
 * Tool control: every third-party Tool on one screen — state, how well each source is doing, and the
 * switches. Opens one Tool with `?tool=<id>`. The Rules tab is the platform's knobs for Tools (the
 * switch-off thresholds, and each organization's off switch, disabled Tools and spending caps).
 */
export function ToolControlPage() {
  const toolId = useSearchParams()?.get("tool") ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col px-[var(--matrx-page-gutter)] pt-[var(--matrx-page-top)] pb-[var(--matrx-page-end)]">
      {toolId ? (
        <ToolDetail toolId={toolId} />
      ) : (
        <Tabs defaultValue="tools" className="flex min-h-0 flex-1 flex-col">
          <TabsList overflow="wrap">
            <TabsTrigger value="tools">Tools</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="rules">Rules</TabsTrigger>
          </TabsList>
          <TabsContent value="tools" className="mt-3 flex min-h-0 flex-1 flex-col">
            <ToolsTable />
          </TabsContent>
          <TabsContent value="accounts" className="mt-3 flex min-h-0 flex-1 flex-col">
            <AccountsPanel />
          </TabsContent>
          <TabsContent value="rules" className="mt-3 min-h-0 flex-1 overflow-auto">
            <FeatureKnobsPanel feature="tools" />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
