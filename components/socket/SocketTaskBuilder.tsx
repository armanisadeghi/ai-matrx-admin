'use client';
import React, { useEffect, useState } from 'react';
import { ConfigBuilder } from "@/components/ui";
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { selectTaskById, setTaskFields, submitTask, updateTaskFieldByPath } from '@/lib/redux/socket-io';
interface SocketConfigBuilderProps {
  taskId: string;
  className?: string;
  onConfigChange?: (config: any) => void;
}

export const SocketTaskBuilder: React.FC<SocketConfigBuilderProps> = ({
  taskId,
  className = "bg-textured text-gray-900 dark:text-gray-100",
  onConfigChange
}) => {
  const [currentConfig, setCurrentConfig] = useState<any>({});
  const initialConfig = useAppSelector((state) => selectTaskById(state, taskId)?.taskData);

  useEffect(() => {
    setCurrentConfig(initialConfig);
  }, []);

  const dispatch = useAppDispatch();

  // Handle configuration changes from the ConfigBuilder
  const handleConfigChange = (config: any) => {
    setCurrentConfig(config);
    if (onConfigChange) {
      onConfigChange(config);
    }
  };

  // Handle setting the data
  const handleSetData = () => {
    dispatch(setTaskFields({ taskId, fields: currentConfig }));
  };

  const handleSend = () => {
    dispatch(setTaskFields({ taskId, fields: currentConfig }));
    dispatch(submitTask({ taskId }));
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