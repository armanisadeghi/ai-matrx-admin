"use client";

import React, {
  useState,
  useCallback,
  ErrorInfo,
  ReactNode,
  Component,
} from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Check,
  AlertTriangle,
  Code,
  Eye,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// ERROR BOUNDARY
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RenderErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ResponseViewer render error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// =============================================================================
// JSON EXPLORER
// =============================================================================

interface JsonNodeProps {
  data: unknown;
  keyName?: string;
  depth?: number;
  defaultExpanded?: boolean;
}

function JsonNode({
  data,
  keyName,
  depth = 0,
  defaultExpanded = true,
}: JsonNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded && depth < 2);

  const isExpandable = data !== null && typeof data === "object";
  const isArray = Array.isArray(data);

  const getPreview = () => {
    if (isArray) return `Array(${(data as unknown[]).length})`;
    if (typeof data === "object" && data !== null) {
      const keys = Object.keys(data);
      return `{${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", ..." : ""}}`;
    }
    return "";
  };

  const renderValue = () => {
    if (data === null) return <span className="text-orange-500">null</span>;
    if (data === undefined)
      return <span className="text-muted-foreground">undefined</span>;
    if (typeof data === "boolean")
      return (
        <span className="text-purple-500 dark:text-purple-400">
          {String(data)}
        </span>
      );
    if (typeof data === "number")
      return <span className="text-blue-500 dark:text-blue-400">{data}</span>;
    if (typeof data === "string") {
      const displayStr = data.length > 200 ? data.slice(0, 200) + "..." : data;
      return (
        <span className="text-green-600 dark:text-green-400">
          "{displayStr}"
        </span>
      );
    }
    return null;
  };

  if (!isExpandable) {
    return (
      <div
        className="flex items-start gap-2 py-0.5"
        style={{ paddingLeft: depth * 16 }}
      >
        {keyName && (
          <span className="text-rose-600 dark:text-rose-400 font-medium shrink-0">
            "{keyName}":
          </span>
        )}
        {renderValue()}
      </div>
    );
  }

  const entries = isArray
    ? (data as unknown[]).map(
        (item, index) => [index, item] as [number, unknown],
      )
    : Object.entries(data as object);

  return (
    <div className="py-0.5">
      <div
        className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-1 -mx-1"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
        {keyName && (
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            "{keyName}":
          </span>
        )}
        <span className="text-muted-foreground text-xs">{getPreview()}</span>
      </div>
      {expanded && (
        <div>
          {entries.map(([key, value]) => (
            <JsonNode
              key={String(key)}
              data={value}
              keyName={String(key)}
              depth={depth + 1}
              defaultExpanded={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JsonExplorer({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [data]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted shrink-0">
        <span className="text-xs text-muted-foreground">JSON Explorer</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="ml-1.5 text-xs">{copied ? "Copied!" : "Copy"}</span>
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        <JsonNode data={data} defaultExpanded={true} />
      </div>
    </div>
  );
}

// =============================================================================
// RAW JSON VIEW
// =============================================================================

function RawJsonView({ data }: { data: unknown }) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [jsonString]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted shrink-0">
        <span className="text-xs text-muted-foreground">
          Raw JSON ({(jsonString.length / 1024).toFixed(1)} KB)
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span className="ml-1.5 text-xs">{copied ? "Copied!" : "Copy"}</span>
        </Button>
      </div>
      <pre className="flex-1 overflow-auto p-4 text-xs text-foreground font-mono whitespace-pre-wrap">
        {jsonString}
      </pre>
    </div>
  );
}

// =============================================================================
// RESPONSE VIEWER
// =============================================================================

interface ResponseViewerProps {
  data: unknown;
  isLoading?: boolean;
  error?: string | null;
  renderContent?: (data: unknown) => ReactNode;
  title?: string;
  className?: string;
}

export function ResponseViewer({
  data,
  isLoading,
  error,
  renderContent,
  title = "Response",
  className,
}: ResponseViewerProps) {
  const [activeTab, setActiveTab] = useState<string>(
    renderContent ? "rendered" : "explorer",
  );
  const [renderError, setRenderError] = useState<Error | null>(null);

  const handleRenderError = useCallback((err: Error) => {
    setRenderError(err);
    setActiveTab("explorer");
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "h-full flex items-center justify-center bg-card rounded-lg border border-border",
          className,
        )}
      >
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading response...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          "h-full flex items-center justify-center bg-card rounded-lg border border-destructive/40",
          className,
        )}
      >
        <div className="text-center space-y-3 max-w-md p-6">
          <AlertTriangle className="w-10 h-10 mx-auto text-destructive" />
          <h3 className="font-semibold text-destructive">Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data) {
    return (
      <div
        className={cn(
          "h-full flex items-center justify-center bg-card rounded-lg border border-border",
          className,
        )}
      >
        <div className="text-center space-y-3">
          <Code className="w-8 h-8 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No data to display</p>
          <p className="text-xs text-muted-foreground/60">
            Submit a request to see results
          </p>
        </div>
      </div>
    );
  }

  const tabs = [];
  if (renderContent) {
    tabs.push({ id: "rendered", label: "Rendered", icon: Eye });
  }
  tabs.push({ id: "explorer", label: "Explorer", icon: Code });
  tabs.push({ id: "raw", label: "Raw JSON", icon: Code });

  return (
    <div
      className={cn(
        "h-full flex flex-col bg-card rounded-lg border border-border overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted shrink-0">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>

        {renderError && (
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Render failed - showing JSON</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border h-9 px-2 shrink-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="text-xs h-7 px-3 data-[state=active]:bg-background"
            >
              <tab.icon className="w-3.5 h-3.5 mr-1.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {renderContent && (
          <TabsContent value="rendered" className="flex-1 overflow-auto m-0">
            <RenderErrorBoundary
              fallback={
                <div className="p-4 text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                  <p className="text-sm text-amber-600">
                    Render error - see Explorer tab
                  </p>
                </div>
              }
              onError={handleRenderError}
            >
              {renderContent(data)}
            </RenderErrorBoundary>
          </TabsContent>
        )}

        <TabsContent value="explorer" className="flex-1 overflow-hidden m-0">
          <JsonExplorer data={data} />
        </TabsContent>

        <TabsContent value="raw" className="flex-1 overflow-hidden m-0">
          <RawJsonView data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ResponseViewer;
