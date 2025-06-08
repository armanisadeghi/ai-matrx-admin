"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SocketPresetManager } from "../SocketPresetManager";
import { SocketButtonTrigger } from "../triggers/SocketButtonTrigger";
import { SocketPanelResponseWrapper } from "../responses/SocketPanelResponseWrapper";

interface CustomLayoutExampleProps {
  presetName: string;
  sourceData: any;
  title?: string;
  description?: string;
}

/**
 * Example showing custom layout using the children render prop
 * 
 * This demonstrates how to:
 * - Use custom layouts while keeping modular components
 * - Access execution state for custom UI
 * - Combine trigger and response in any layout you want
 */
export const CustomLayoutExample: React.FC<CustomLayoutExampleProps> = ({
  presetName,
  sourceData,
  title = "Socket Task Execution",
  description,
}) => {
  return (
    <SocketPresetManager
      config={{
        presetName,
        sourceData,
        onExecuteStart: (data) => console.log('🚀 Starting:', data),
        onExecuteComplete: (taskId) => console.log('✅ Complete:', taskId),
        onExecuteError: (error) => console.error('❌ Error:', error),
      }}
      TriggerComponent={(props) => (
        <SocketButtonTrigger 
          {...props} 
          buttonText="Run Task"
          variant="outline"
          className="w-full"
        />
      )}
      ResponseComponent={SocketPanelResponseWrapper}
    >
      {({ triggerElement, responseElement, taskId, isExecuting, error }) => (
        <div className="space-y-6">
          {/* Header Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-800 dark:text-gray-200">
                {title}
              </CardTitle>
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {description}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Preset: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{presetName}</code>
              </p>
            </CardHeader>
            <CardContent>
              {/* Status indicator */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-3 h-3 rounded-full ${
                  error ? 'bg-red-500' : 
                  taskId ? 'bg-green-500' : 
                  isExecuting ? 'bg-yellow-500 animate-pulse' : 
                  'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {error ? 'Failed' : 
                   taskId ? 'Completed' : 
                   isExecuting ? 'Executing...' : 
                   'Ready'}
                </span>
              </div>
              
              {/* Trigger */}
              {triggerElement}
            </CardContent>
          </Card>

          {/* Response Card */}
          {(taskId || isExecuting || error) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-gray-800 dark:text-gray-200">
                  Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {responseElement}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </SocketPresetManager>  
  );
};

export default CustomLayoutExample; 