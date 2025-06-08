"use client";

import React from "react";
import { SocketPresetManager } from "../SocketPresetManager";
import { SocketButtonTrigger } from "../triggers/SocketButtonTrigger";
import { SocketPanelResponseWrapper } from "../responses/SocketPanelResponseWrapper";

interface SimpleExecuteExampleProps {
  presetName: string;
  sourceData: any;
  buttonText?: string;
}

/**
 * Simple example showing the basic usage of the new modular system
 * 
 * This replaces the complex SocketExecuteButton with a clean, modular approach:
 * - Uses SocketPresetManager as the orchestrator
 * - Uses SocketButtonTrigger for the button
 * - Uses SocketPanelResponseWrapper for results
 * - All state is managed through Redux
 */
export const SimpleExecuteExample: React.FC<SimpleExecuteExampleProps> = ({
  presetName,
  sourceData,
  buttonText = "Execute",
}) => {
  return (
    <SocketPresetManager
      config={{
        presetName,
        sourceData,
        onExecuteStart: (data) => console.log('🚀 Starting execution:', data),
        onExecuteComplete: (taskId) => console.log('✅ Execution complete:', taskId),
        onExecuteError: (error) => console.error('❌ Execution failed:', error),
      }}
      TriggerComponent={(props) => (
        <SocketButtonTrigger 
          {...props} 
          buttonText={buttonText}
        />
      )}
      ResponseComponent={SocketPanelResponseWrapper}
    />
  );
};

export default SimpleExecuteExample; 