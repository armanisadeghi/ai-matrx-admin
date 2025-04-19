"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux/store";
import { Card, CardContent, CardHeader, CardTitle, ScrollArea, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { CopyButton } from "@/components/matrx/buttons/CopyButton";
import { cn } from "@/lib/utils";
import JsonToCollapsible from "@/components/matrx/matrx-collapsible/json-to-collapsible";
import StreamDisplayOverlay from "./StreamDisplayOverlay";
import { MouseEvent } from "react";

interface StreamObjectDisplayProps {
  title: string;
  selector: (state: RootState) => any;
  isFullscreen?: boolean;
}

const StreamObjectDisplay = ({ 
  title, 
  selector, 
  isFullscreen = false 
}: StreamObjectDisplayProps) => {
  // Safely handle potentially null/undefined data
  const rawData = useSelector(selector);
  const data = rawData ?? {};
  
  // Check if data is non-empty
  const hasContent = Array.isArray(data) 
    ? data.length > 0 
    : (data && typeof data === 'object' && Object.keys(data).length > 0);
  
  // For safe JSON stringification
  const safeStringify = (value: any, indent = 2): string => {
    try {
      return JSON.stringify(value, null, indent);
    } catch (error) {
      return `[Unable to stringify: ${error}]`;
    }
  };
  
  const jsonString = safeStringify(data);

  // Prevent event propagation to avoid triggering fullscreen mode
  const handleInteractiveClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  // Render tabs with content
  const renderTabs = () => (
    <Tabs defaultValue="json" className={cn("w-full", isFullscreen && "h-full")} onClick={handleInteractiveClick}>
      <TabsList className={cn("mb-2", isFullscreen && "mb-4")}>
        <TabsTrigger value="json">JSON View</TabsTrigger>
        <TabsTrigger value="tree">Tree View</TabsTrigger>
      </TabsList>
      
      <TabsContent value="tree" className={isFullscreen ? "h-[calc(100%-3rem)]" : ""}>
        <div className={isFullscreen ? "h-full" : "max-h-56 overflow-auto"} onClick={handleInteractiveClick}>
          {hasContent ? (
            <ScrollArea className={cn(
              "w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
              isFullscreen ? "p-4 h-full" : "p-3"
            )}>
              <JsonToCollapsible
                title=""
                data={data}
                defaultExpanded={true}
                className={isFullscreen ? "text-sm font-mono" : "text-xs font-mono"}
              />
            </ScrollArea>
          ) : (
            <div className="h-full w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-center">
              <span className={cn(
                "text-gray-500 dark:text-gray-400 italic",
                isFullscreen ? "text-sm" : "text-xs"
              )}>
                No data available
              </span>
            </div>
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="json" className={isFullscreen ? "h-[calc(100%-3rem)]" : ""}>
        <ScrollArea className={cn(
          "w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
          isFullscreen ? "h-full" : "max-h-56"
        )} onClick={handleInteractiveClick}>
          {hasContent ? (
            <pre className={cn(
              "font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-300",
              isFullscreen ? "p-4 text-sm" : "p-3 text-xs"
            )}>
              {jsonString}
            </pre>
          ) : (
            <div className={cn(
              "text-gray-500 dark:text-gray-400 italic",
              isFullscreen ? "p-4 text-sm" : "p-3 text-xs"
            )}>
              No data available
            </div>
          )}
        </ScrollArea>
      </TabsContent>
    </Tabs>
  );

  // If fullscreen, just return the content
  if (isFullscreen) {
    return renderTabs();
  }

  // Normal view with card container
  return (
    <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</CardTitle>
        {hasContent && <CopyButton content={jsonString} label="" size="sm" />}
      </CardHeader>
      <CardContent className="p-3">
        <StreamDisplayOverlay 
          title={title} 
          className="h-[calc(95vh-5rem)]"
        >
          {renderTabs()}
        </StreamDisplayOverlay>
      </CardContent>
    </Card>
  );
};

export default StreamObjectDisplay; 