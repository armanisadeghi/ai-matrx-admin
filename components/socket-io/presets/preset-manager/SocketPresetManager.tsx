"use client";

import React, { ReactNode, useEffect } from "react";
import { useSocketPresetExecution } from "./hooks/useSocketPresetExecution";
import { SocketAdminOverlay } from "./responses/SocketAdminOverlay";

// ===== CORE TYPES =====

/**
 * Core execution configuration
 */
export interface SocketPresetExecutionConfig {
  presetName: string;
  sourceData: any;
  onExecuteStart?: (data: any) => void;
  onExecuteComplete?: (taskId: string) => void;
  onExecuteError?: (error: string) => void;
}

/**
 * Props for trigger components
 */
export interface SocketPresetTriggerProps {
  config: SocketPresetExecutionConfig;
  onExecute: (data?: any) => void;
  isExecuting?: boolean;
}

/**
 * Props for response components  
 */
export interface SocketPresetResponseProps {
  taskId: string | null;
  isExecuting?: boolean;
  error?: string | null;
}

/**
 * Main SocketPresetManager props
 */
export interface SocketPresetManagerProps {
  // Core configuration
  config: SocketPresetExecutionConfig;
  
  // Component composition
  TriggerComponent: React.ComponentType<SocketPresetTriggerProps>;
  ResponseComponent?: React.ComponentType<SocketPresetResponseProps>;
  
  // Optional wrapper/layout
  children?: (props: {
    triggerElement: ReactNode;
    responseElement: ReactNode;
    taskId: string | null;
    isExecuting: boolean;
    error: string | null;
  }) => ReactNode;
  
  // Behavior
  autoExecute?: boolean;
}

/**
 * The main orchestrator component
 * 
 * This component:
 * - Has minimal UI opinions (just renders what you give it)
 * - Uses Redux for all state management 
 * - Provides a clean interface for trigger and response components
 * - Supports custom layouts through children render prop
 */
export const SocketPresetManager: React.FC<SocketPresetManagerProps> = ({
  config,
  TriggerComponent,
  ResponseComponent,
  children,
  autoExecute = false,
}) => {
  // Use the execution hook for Redux-based state management
  const { 
    isExecuting, 
    taskId, 
    error, 
    execute: handleExecute 
  } = useSocketPresetExecution(config);
  
  // Handle auto-execution
  useEffect(() => {
    if (autoExecute) {
      handleExecute();
    }
  }, [autoExecute, handleExecute]);
  
  // Create the trigger element
  const triggerElement = (
    <TriggerComponent
      config={config}
      onExecute={handleExecute}
      isExecuting={isExecuting}
    />
  );
  
  // Create the response element 
  const responseElement = ResponseComponent ? (
    <ResponseComponent
      taskId={taskId}
      isExecuting={isExecuting}
      error={error}
    />
  ) : (
    <SocketAdminOverlay
      taskId={taskId}
      showOverlay={!!taskId}
      onClose={() => {}}
    />
  );
  
  // If children function provided, use custom layout
  if (children) {
    return (
      <>
        {children({
          triggerElement,
          responseElement,
          taskId,
          isExecuting,
          error,
        })}
      </>
    );
  }
  
  // Default layout: just render trigger and response
  return (
    <div className="socket-preset-manager">
      {triggerElement}
      {responseElement}
    </div>
  );
};

export default SocketPresetManager;
