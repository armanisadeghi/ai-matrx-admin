"use client";
import React from "react";
import { Radio, CheckCircle, XCircle } from "lucide-react";
import { FiRefreshCw } from "react-icons/fi";
import { Button, Label, Switch } from "@/components/ui";
import ConnectionStatusIndicator from "@/components/socket-io/status-indicators/ConnectionStatusIndicator";
import AuthStatusIndicator from "@/components/socket-io/status-indicators/AuthStatusIndicator";
import ConnectionTypeIndicator from "@/components/socket-io/status-indicators/ConnectionTypeIndicator";
import { StatusIndicator } from '@/components/socket-io/status-indicators/StatusIndicator';
import ConnectionManager from "@/components/socket-io/socket-connection/ConnectionManager";
import ActiveConnectionSelector from "@/components/socket-io/socket-connection/ActiveConnectionSelector";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectPrimaryConnectionId, selectTestMode } from "@/lib/redux/socket-io";
import { ServiceTaskSelector } from "@/components/socket-io/select-components/ServiceTaskSelector";
import { toggleTestMode } from "@/lib/redux/socket-io/slices/socketConnectionsSlice";
import SocketDebugModal from "@/components/socket-io/modals/SocketDebugModal";

interface SocketHeaderProps {
  onTestModeChange?: (testMode: boolean) => void;
  onConnectionSelect?: (connectionId: string) => void;
  onTaskCreate?: (taskId: string) => void;
}

export function SocketHeaderFull({ 
  onTestModeChange = () => {},
  onConnectionSelect,
  onTaskCreate,
}: SocketHeaderProps) {
  const dispatch = useAppDispatch();
  const testMode = useAppSelector(selectTestMode);
  const primaryConnectionId = useAppSelector(selectPrimaryConnectionId);
  
  // Local UI state
  const [streamEnabled, setStreamEnabled] = React.useState(false);
  const [isResponseActive, setIsResponseActive] = React.useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = React.useState<string>(primaryConnectionId);
  const [showConnectionManager, setShowConnectionManager] = React.useState(false);
  const [currentTaskId, setCurrentTaskId] = React.useState<string>("");
  
  // Handle connection selection
  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    if (onConnectionSelect) {
      onConnectionSelect(connectionId);
    }
  };
  
  // Handle reset - go back to primary connection
  const handleReset = () => {
    setSelectedConnectionId(primaryConnectionId);
    if (onConnectionSelect) {
      onConnectionSelect(primaryConnectionId);
    }
  };
  
  // Handle test mode change
  const handleTestModeChange = (value: boolean) => {
    dispatch(toggleTestMode());
    if (onTestModeChange) {
      onTestModeChange(value);
    }
  };
  
  // Handle task creation
  const handleTaskCreate = (taskId: string) => {
    setCurrentTaskId(taskId);
    if (onTaskCreate) {
      onTaskCreate(taskId);
    }
  };
  
  return (
    <div className="py-2 px-3 space-y-1 bg-gray-200 dark:bg-gray-900 border-3 border-gray-300 dark:border-gray-600 rounded-3xl">
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex space-x-3 items-center">
          <h3 className="text-lg font-bold pr-4">Socket.IO Admin</h3>
          <ConnectionStatusIndicator />
          <AuthStatusIndicator />
          <ConnectionTypeIndicator />
          <StatusIndicator
            isActive={isResponseActive}
            label="Stream"
            icon={{
              active: <Radio className="h-4 w-4 text-green-500" />,
              inactive: <Radio className="h-4 w-4 text-gray-400" />,
            }}
          />
          <StatusIndicator
            isActive={isResponseActive}
            label="Response Active"
            icon={{
              active: <CheckCircle className="h-4 w-4 text-green-500" />,
              inactive: <XCircle className="h-4 w-4 text-red-500" />,
            }}
          />
          <SocketDebugModal taskId={currentTaskId} debugMode={true} />
        </div>
        <div className="flex items-center space-x-4">
          <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
          <Label>Streaming</Label>
          <Switch 
            checked={testMode} 
            onCheckedChange={handleTestModeChange} 
          />
          <Label>Test Mode</Label>
          <Button
            onClick={handleReset}
            disabled={selectedConnectionId === primaryConnectionId}
            variant="ghost"
          >
            <FiRefreshCw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button 
            onClick={() => setShowConnectionManager(!showConnectionManager)} 
            variant="ghost"
          >
            {showConnectionManager ? "Hide Connections" : "Connections"}
          </Button>
        </div>
      </div>
      {showConnectionManager && (
        <div className="py-2">
          <ConnectionManager defaultOpen={true} />
        </div>
      )}
      <div className="grid md:grid-cols-4 gap-3">
        {/* Connection Selection */}
        <div>
          <ActiveConnectionSelector 
            selectedConnectionId={selectedConnectionId}
            onConnectionSelect={handleConnectionSelect}
          />
        </div>
        {/* Service & Task Selection (using the new combined component) */}
        <div className="col-span-3">
          <ServiceTaskSelector 
            connectionId={selectedConnectionId}
            onTaskCreate={handleTaskCreate}
          />
        </div>
      </div>
    </div>
  );
}