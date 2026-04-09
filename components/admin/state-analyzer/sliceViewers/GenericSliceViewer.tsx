"use client";

import React, { useMemo } from "react";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import JsonTree from "@/components/admin/state-analyzer/components/JsonTree";
import { JsonTreeViewer } from "@/components/official/json-explorer/JsonTreeViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatJson } from "@/utils/json/json-cleaner-utility";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";
import { JsonTruncator } from "@/components/official-candidate/json-truncator/JsonTruncator";
import { ChevronLeft } from "lucide-react";
import {
  useTabNavigation,
  TAB_INDEX_ID,
} from "@/components/admin/state-analyzer/stateViewerTabs";

const TRIGGER =
  "text-xs px-2 py-0.5 h-6 rounded-none border-r border-border last:border-r-0 " +
  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none " +
  "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground";

const GenericSliceViewer = ({
  sliceKey,
  state,
}: {
  sliceKey: string;
  state: unknown;
}) => {
  const formattedJson = formatJson(state, 2);
  const truncatorValue = useMemo(
    () => (typeof state === "string" ? state : JSON.stringify(state, null, 2)),
    [state],
  );
  const navigate = useTabNavigation();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-800 rounded-lg overflow-hidden min-h-0">
      <Tabs
        defaultValue="json"
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex items-center gap-2 pl-1.5 pr-8 py-1 border-b border-border flex-shrink-0">
          {navigate && (
            <button
              onClick={() => navigate(TAB_INDEX_ID)}
              className="shrink-0 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Back to Tab Index"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          <h2 className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate shrink-0">
            {sliceKey}
          </h2>
          <TabsList className="h-auto shrink-0 gap-0 rounded-md border border-border bg-transparent p-0 overflow-hidden">
            <TabsTrigger className={TRIGGER} value="json">
              JSON
            </TabsTrigger>
            <TabsTrigger className={TRIGGER} value="raw">
              Explorer
            </TabsTrigger>
            <TabsTrigger className={TRIGGER} value="tree-viewer">
              Tree
            </TabsTrigger>
            <TabsTrigger className={TRIGGER} value="json-tree">
              JSON Tree
            </TabsTrigger>
            <TabsTrigger className={TRIGGER} value="truncator">
              Truncator
            </TabsTrigger>
          </TabsList>
          <div className="flex-1" />
          <CopyButton content={formattedJson} size="sm" className="shrink-0" />
        </div>

        {/* ── Tab panels — all flex-1 so they fill the remaining height ── */}
        <TabsContent
          value="json"
          className="flex-1 min-h-0 overflow-auto mt-0 border-none outline-none ring-0 bg-gray-50 dark:bg-zinc-900"
        >
          <pre className="p-2 text-xs text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
            {formattedJson}
          </pre>
        </TabsContent>

        <TabsContent
          value="raw"
          className="flex-1 min-h-0 overflow-auto mt-0 border-none outline-none ring-0 bg-gray-50 dark:bg-zinc-900"
        >
          <RawJsonExplorer pageData={state} />
        </TabsContent>

        <TabsContent
          value="tree-viewer"
          className="flex-1 min-h-0 overflow-auto mt-0 border-none outline-none ring-0 bg-gray-50 dark:bg-zinc-900"
        >
          <JsonTreeViewer data={state} />
        </TabsContent>

        <TabsContent
          value="json-tree"
          className="flex-1 min-h-0 overflow-auto mt-0 border-none outline-none ring-0 bg-gray-50 dark:bg-zinc-900"
        >
          <JsonTree data={state} />
        </TabsContent>

        {/* Truncator fills height directly — no extra overflow wrapper needed */}
        <TabsContent
          value="truncator"
          className="flex-1 min-h-0 overflow-hidden mt-0 border-none outline-none ring-0"
        >
          <JsonTruncator
            initialValue={truncatorValue}
            tabbed
            defaultTab="fields"
            className="h-full"
            allowLayoutToggle
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GenericSliceViewer;
