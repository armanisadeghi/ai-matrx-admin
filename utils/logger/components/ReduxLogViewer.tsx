"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Settings,
  Database,
  Bug,
} from "lucide-react";
import { logEmitter } from "./ReduxLogger";
import DataDisplay from "./DataDisplay";

interface CollapsibleCardProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border rounded bg-card mb-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-2 flex items-center gap-2 hover:bg-accent/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <span className="text-sm font-medium text-foreground">{title}</span>
      </button>
      {isExpanded && (
        <div className="p-2 border-t border-border">{children}</div>
      )}
    </div>
  );
};

interface DataDisplayProps {
  data: any;
}

const JsonDataDisplay: React.FC<DataDisplayProps> = ({ data }) => {
  if (typeof data === "object" && data !== null) {
    return (
      <pre className="text-xs px-1 py-0.5 rounded bg-muted text-foreground break-all whitespace-pre-wrap">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }
  return (
    <code className="text-xs px-1 py-0.5 rounded bg-muted text-foreground break-all">
      {String(data)}
    </code>
  );
};

interface LogIconProps {
  type?: string;
}

const LogIcon: React.FC<LogIconProps> = ({ type }) => {
  switch (type?.toLowerCase()) {
    case "error":
      return <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400" />;
    case "warning":
      return (
        <AlertCircle className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
      );
    case "success":
      return (
        <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400" />
      );
    case "debug":
      return <Bug className="w-3 h-3 text-purple-500 dark:text-purple-400" />;
    default:
      return <Info className="w-3 h-3 text-blue-500 dark:text-blue-400" />;
  }
};

const formatTimestamp = (timestamp: string) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

interface ReduxLogViewerProps {
  maxLogs?: number;
}

const ReduxLogViewer: React.FC<ReduxLogViewerProps> = ({ maxLogs = 100 }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any>(null);
  const [state, setState] = useState<Record<string, any>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const handleNewLog = (log: any) => {
      setLogs((prevLogs) => {
        const updatedLogs = [log, ...prevLogs];
        return updatedLogs.slice(0, maxLogs);
      });
    };

    const handleUpdateConfigs = (newConfigs: any) => {
      setConfigs(newConfigs);
    };

    const handleUpdateState = (newState: any) => {
      console.log("State update received:", newState);
      setState((prevState) => ({
        ...prevState,
        ...newState,
      }));
    };

    const handleDebugLog = (debugInfo: any) => {
      setLogs((prevLogs) => {
        const updatedLogs = [debugInfo, ...prevLogs];
        return updatedLogs.slice(0, maxLogs);
      });
    };

    logEmitter.on("newLog", handleNewLog);
    logEmitter.on("updateConfigs", handleUpdateConfigs);
    logEmitter.on("updateState", handleUpdateState);
    logEmitter.on("debugLog", handleDebugLog);

    return () => {
      logEmitter.off("newLog", handleNewLog);
      logEmitter.off("updateConfigs", handleUpdateConfigs);
      logEmitter.off("updateState", handleUpdateState);
      logEmitter.off("debugLog", handleDebugLog);
    };
  }, [maxLogs]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs, autoScroll]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">
            Debug Console
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-2 bg-background">
        {configs && (
          <CollapsibleCard title="Configs" icon={Settings}>
            <DataDisplay data={configs} />
          </CollapsibleCard>
        )}

        {Object.keys(state).length > 0 && (
          <CollapsibleCard title="State" icon={Database} defaultExpanded={true}>
            <JsonDataDisplay data={state} />
          </CollapsibleCard>
        )}

        <CollapsibleCard title="Logs" icon={Bug} defaultExpanded={true}>
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-2 rounded border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <LogIcon type={log.type} />
                    <span className="text-xs font-medium text-muted-foreground shrink-0">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className="text-sm font-medium text-foreground truncate">
                      {log.message}
                    </span>
                  </div>
                  {log.action?.type && (
                    <div>
                      <code className="text-xs px-1 py-0.5 rounded bg-muted text-muted-foreground break-all">
                        {log.action.type}
                      </code>
                    </div>
                  )}
                  {log.data && Object.keys(log.data).length > 0 && (
                    <div className="mt-1">
                      <DataDisplay data={log.data} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleCard>
      </div>
    </div>
  );
};

export default ReduxLogViewer;
