'use client';
import React, { useState } from 'react';
import { ConfigBuilder } from "@/components/ui";
import { SocketHook } from '@/lib/redux/socket/hooks/useSocket';

interface SocketConfigBuilderProps {
  socketHook: SocketHook;
  className?: string;
  onConfigChange?: (config: any) => void;
}

export const SocketTaskBuilder: React.FC<SocketConfigBuilderProps> = ({
  socketHook,
  className = "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
  onConfigChange
}) => {
  const { setTaskData, handleSend } = socketHook;
  const [currentConfig, setCurrentConfig] = useState<any>({});

  // Handle configuration changes from the ConfigBuilder
  const handleConfigChange = (config: any) => {
    console.log("Config changed:", config);
    setCurrentConfig(config);
    if (onConfigChange) {
      onConfigChange(config);
    }
  };

  // Handle setting the data
  const handleSetData = () => {
    console.log("Setting data:", currentConfig);
    setTaskData(currentConfig);
  };

  return (
    <div className="w-full">
      <ConfigBuilder
        initialConfig={currentConfig}
        onConfigChange={handleConfigChange}
        className={className}
      />
      
      <div className="flex gap-3 mt-4">
        <span 
          onClick={handleSetData}
          className="px-4 py-2 rounded text-xs cursor-pointer bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          Set Data
        </span>
        
        <span 
          onClick={handleSend}
          className="px-4 py-2 rounded text-xs cursor-pointer bg-blue-500 hover:bg-blue-600 text-white"
        >
          Submit
        </span>
      </div>
    </div>
  );
};

export default SocketTaskBuilder;