'use client';

import React, { useState } from 'react';
import { useAppSelector } from "@/lib/redux";
import { 
  Check, X, AlertCircle, Clock, Play, Box, Copy, 
  ChevronDown, ChevronUp, Info
} from "lucide-react";
import {
  selectIsConnected, 
  selectTaskValidationState, 
  selectTaskStatus,
  selectTaskListenerIds,
  selectAllTasks,
  selectTasksByStatus,
  selectHasResponseErrors
} from "@/lib/redux/socket-io/selectors";

// The original StatusIndicator for binary states
interface BinaryStatusIndicatorProps {
  goodStatus: boolean;
  label: string;
  goodIcon: React.ReactNode;
  badIcon: React.ReactNode;
}

const BinaryStatusIndicator = ({ goodStatus, label, goodIcon, badIcon }: BinaryStatusIndicatorProps) => (
  <div className="flex items-center space-x-1">
    <div className={`${goodStatus ? "text-green-500" : "text-red-500"}`}>
      {goodStatus ? goodIcon : badIcon}
    </div>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

// New status indicator that uses isActive API
export interface StatusIndicatorProps {
  isActive: boolean;
  label: string;
  icon: {
    active: React.ReactNode;
    inactive: React.ReactNode;
  };
  className?: string;
}

export const StatusIndicator = ({ 
  isActive, 
  label, 
  icon,
  className = ''
}: StatusIndicatorProps) => (
  <div className={`flex items-center space-x-1 ${className}`}>
    <span className="mr-1">{isActive ? icon.active : icon.inactive}</span>
    <span className="text-sm">{label}</span>
  </div>
);

// New component for multi-state statuses with configurable icons and colors
interface StatusOption {
  value: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface MultiStateStatusProps {
  currentStatus: string;
  options: StatusOption[];
  label?: string;
}

export const MultiStateStatus = ({ currentStatus, options, label }: MultiStateStatusProps) => {
  const option = options.find(opt => opt.value === currentStatus) || {
    value: "unknown",
    label: "Unknown",
    icon: <Info size={16} />,
    color: "text-gray-400"
  };

  return (
    <div className="flex items-center space-x-1">
      <div className={option.color}>{option.icon}</div>
      <span className="text-sm text-muted-foreground">
        {label ? `${label}: ` : ""}{option.label}
      </span>
    </div>
  );
};

// New component for displaying truncated lists with clipboard functionality
interface TruncatedListProps {
  items: string[];
  maxDisplay?: number;
  label?: string;
}

export const TruncatedList = ({ items, maxDisplay = 2, label }: TruncatedListProps) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayItems = expanded ? items : items.slice(0, maxDisplay);
  const hasMore = items.length > maxDisplay;

  const handleCopy = () => {
    navigator.clipboard.writeText(items.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      {label && <div className="text-sm font-medium mb-1">{label}</div>}
      <div className="flex flex-col space-y-1 text-sm">
        {displayItems.map((item, i) => (
          <div key={i} className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs overflow-hidden text-ellipsis">
            {item}
          </div>
        ))}
        {!expanded && hasMore && (
          <div className="text-xs text-muted-foreground">{items.length - maxDisplay} more...</div>
        )}
      </div>
      <div className="flex mt-1 space-x-2">
        {hasMore && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="text-xs flex items-center text-blue-500 hover:text-blue-700"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span className="ml-1">{expanded ? "Show less" : "Show all"}</span>
          </button>
        )}
        <button 
          onClick={handleCopy} 
          className="text-xs flex items-center text-blue-500 hover:text-blue-700"
        >
          <Copy size={14} />
          <span className="ml-1">{copied ? "Copied!" : "Copy all"}</span>
        </button>
      </div>
    </div>
  );
};


// Original implementations from your code
export const SocketConnectionStatusIndicator = () => {
  const isConnected = useAppSelector(selectIsConnected);
  return (
    <BinaryStatusIndicator 
      goodStatus={isConnected} 
      label="Socket Connection" 
      goodIcon={<Check size={16} />} 
      badIcon={<X size={16} />} 
    />
  );
};

export const SocketTaskValidationStatusIndicator = ({ taskId }: { taskId: string }) => {
  const { isValid, validationErrors } = useAppSelector(state => selectTaskValidationState(state, taskId));
  return (
    <BinaryStatusIndicator 
      goodStatus={isValid} 
      label="Task Validation" 
      goodIcon={<Check size={16} />} 
      badIcon={<X size={16} />} 
    />
  );
};

// Additional components using the selectors
export const TasksByStatusIndicator = ({ status }: { status: string }) => {
  const tasks = useAppSelector(state => selectTasksByStatus(state, status));
  
  return (
    <div className="flex items-center space-x-1">
      <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
        {tasks.length}
      </div>
      <span className="text-sm text-muted-foreground">Tasks with status: {status}</span>
    </div>
  );
};

export const StreamErrorIndicator = ({ listenerId }: { listenerId: string }) => {
  const hasErrors = useAppSelector(state => selectHasResponseErrors(listenerId)(state));
  
  return (
    <BinaryStatusIndicator 
      goodStatus={!hasErrors} 
      label="Stream Status" 
      goodIcon={<Check size={16} />} 
      badIcon={<AlertCircle size={16} />} 
    />
  );
};


