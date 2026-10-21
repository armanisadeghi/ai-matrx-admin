"use client";

import { useClipboard } from "@ai-matrx/kit/clipboard";
import { copyNotify } from "@/lib/clipboard/copy-notify";
import React, {
  useState,
  useCallback,
  ErrorInfo,
  ReactNode,
  Component,
} from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, Braces, Brackets } from "lucide-react";
import {
  TreeDisclosure,
  treeIndentStyle,
} from "@/components/official/topic-tree/geometry";
import { formatCount } from "@ai-matrx/kit/format";
import { KindDataGate } from "@/components/official/structured-value/KindDataGate";

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

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ResponseViewer render error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override render() {
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
      return (
        <span className="text-green-600 dark:text-green-400">"{data}"</span>
      );
    }
    return null;
  };

  if (!isExpandable) {
    return (
      <div
        className="flex items-start gap-1 min-h-7 py-[5px]"
        style={treeIndentStyle(depth)}
      >
        <TreeDisclosure expandable={false} />
        <span aria-hidden="true" className="h-4 w-4 shrink-0" />
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
    <div>
      <div
        className="flex items-center gap-1 min-h-7 cursor-pointer hover:bg-muted rounded"
        style={treeIndentStyle(depth)}
        onClick={() => setExpanded(!expanded)}
      >
        <TreeDisclosure expandable expanded={expanded} />
        {isArray ? (
          <Brackets className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <Braces className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        {keyName && (
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            "{keyName}":
          </span>
        )}
        <span className="text-muted-foreground">{getPreview()}</span>
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

/**
 * Data carrying a `__kind` is drawn as its kind (`KindDataGate`) unless the
 * caller is a deliberate source view (`showSource`).
 */
export function JsonTreeViewer({
  data,
  showSource = false,
  header = true,
}: {
  data: unknown;
  showSource?: boolean;
  /** False when the host already carries the copy controls (JsonInspector's Tree tab). */
  header?: boolean;
}) {
  return (
    <KindDataGate component="JsonTreeViewer" data={data} showSource={showSource}>
      <JsonTreeViewerBody data={data} header={header} />
    </KindDataGate>
  );
}

function JsonTreeViewerBody({ data, header }: { data: unknown; header: boolean }) {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!(await copyText(JSON.stringify(data, null, 2)))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  return (
    <div className="h-full flex flex-col">
      {header ? (
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted shrink-0">
        <span className="type-secondary text-muted-foreground">JSON Explorer</span>
        <Button
          icon={copied ? (
            <Check className="text-green-500" />
          ) : (
            <Copy />
          )}
          variant="quiet"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy JSON"}
          title={copied ? "Copied" : "Copy JSON"}
        />
      </div>
      ) : null}
      <div className="flex-1 overflow-auto p-3 font-mono type-body">
        <JsonNode data={data} defaultExpanded={true} />
      </div>
    </div>
  );
}

// =============================================================================
// RAW JSON VIEW
// =============================================================================

function RawJsonView({ data }: { data: unknown }) {
  const { copyText } = useClipboard({
    notify: copyNotify,
  });
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = useCallback(async () => {
    if (!(await copyText(jsonString))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [jsonString]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted shrink-0">
        <span className="type-secondary text-muted-foreground">
          Raw JSON ({formatCount(jsonString.length)} chars)
        </span>
        <Button
          icon={copied ? (
            <Check className="text-green-500" />
          ) : (
            <Copy />
          )}
          variant="quiet"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy JSON"}
          title={copied ? "Copied" : "Copy JSON"}
        />
      </div>
      <pre className="flex-1 overflow-auto p-4 type-secondary text-foreground font-mono whitespace-pre-wrap">
        {jsonString}
      </pre>
    </div>
  );
}
