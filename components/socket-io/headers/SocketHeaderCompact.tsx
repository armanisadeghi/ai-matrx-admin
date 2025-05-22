"use client";
import React, { useState } from "react";
import { Radio, CheckCircle, XCircle, ChevronDown, ChevronUp, Settings, Maximize2 } from "lucide-react";
import { FiRefreshCw } from "react-icons/fi";
import { Button, Label, Switch, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import ConnectionStatusIndicator from "@/components/socket-io/status-indicators/ConnectionStatusIndicator";
import AuthStatusIndicator from "@/components/socket-io/status-indicators/AuthStatusIndicator";
import ConnectionTypeIndicator from "@/components/socket-io/status-indicators/ConnectionTypeIndicator";
import { StatusIndicator } from "@/components/socket-io/status-indicators/StatusIndicator";
import ActiveConnectionSelector from "@/components/socket-io/socket-connection/ActiveConnectionSelector";
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { selectPrimaryConnectionId, selectConnectionTestMode } from "@/lib/redux/socket-io";
import { ServiceTaskSelector } from "@/components/socket-io/select-components/ServiceTaskSelector";
import { toggleTestMode } from "@/lib/redux/socket-io/slices/socketConnectionsSlice";
import SocketDebugModal from "@/components/socket-io/modals/SocketDebugModal";

interface SocketHeaderCompactProps {
    onTestModeChange?: (testMode: boolean) => void;
    onConnectionSelect?: (connectionId: string) => void;
    onTaskCreate?: (taskId: string) => void;
    debugMode?: boolean;
    onToggleExpand?: () => void;
    autoMode?: boolean;
    onToggleAutoMode?: () => void;
}

export function SocketHeaderCompact({ 
    onTestModeChange = () => {}, 
    onConnectionSelect, 
    onTaskCreate, 
    debugMode = false,
    onToggleExpand
}: SocketHeaderCompactProps) {
    const dispatch = useAppDispatch();
    const testMode = useAppSelector(selectConnectionTestMode);
    const primaryConnectionId = useAppSelector(selectPrimaryConnectionId);

    // Local UI state
    const [streamEnabled, setStreamEnabled] = useState(false);
    const [isResponseActive, setIsResponseActive] = useState(false);
    const [selectedConnectionId, setSelectedConnectionId] = useState<string>(primaryConnectionId);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string>("");

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
        <div className="bg-gray-200 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl p-2 relative">
            <div className="flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Socket</h3>
                    
                    {/* Status Icons */}
                    <div className="flex space-x-1">
                        <ConnectionStatusIndicator compact />
                        <AuthStatusIndicator compact />
                        <ConnectionTypeIndicator compact />
                        <StatusIndicator
                            isActive={streamEnabled}
                            label="Stream"
                            icon={{
                                active: <Radio className="h-3.5 w-3.5 text-green-500" />,
                                inactive: <Radio className="h-3.5 w-3.5 text-gray-400" />,
                            }}
                            compact
                        />
                        <StatusIndicator
                            isActive={isResponseActive}
                            label="Response"
                            icon={{
                                active: <CheckCircle className="h-3.5 w-3.5 text-green-500" />,
                                inactive: <XCircle className="h-3.5 w-3.5 text-red-500" />,
                            }}
                            compact
                        />
                    </div>
                </div>
                
                {/* Service & Task Selection - now in the same row */}
                <div className="flex-1 max-w-2xl">
                    <ServiceTaskSelector 
                        connectionId={selectedConnectionId} 
                        onTaskCreate={handleTaskCreate}
                        compact
                        inline
                    />
                </div>
                
                <div className="flex items-center space-x-2 flex-shrink-0">
                    {/* Quick Actions */}
                    <div className="flex items-center space-x-1">
                        <Switch 
                            checked={streamEnabled} 
                            onCheckedChange={setStreamEnabled} 
                            className="h-3.5 w-7" 
                        />
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Stream</Label>
                        
                        <Switch 
                            checked={testMode} 
                            onCheckedChange={handleTestModeChange} 
                            className="h-3.5 w-7 ml-1" 
                        />
                        <Label className="text-xs text-gray-600 dark:text-gray-400">Test</Label>
                    </div>
                    
                    {/* Debug Button (if debug mode is on) */}
                    {debugMode && (
                        <SocketDebugModal taskId={currentTaskId} debugMode={true} />
                    )}
                    
                    {/* Expand button */}
                    {onToggleExpand && (
                        <Button
                            onClick={onToggleExpand}
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 rounded-full"
                            title="Expand header"
                        >
                            <Maximize2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                        </Button>
                    )}
                    
                    {/* Advanced Options Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 w-7 p-0 rounded-full"
                            >
                                <Settings className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3">
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium">Connection Settings</h4>
                                
                                {/* Connection selector */}
                                <div className="space-y-1">
                                    <Label className="text-xs">Active Connection</Label>
                                    <ActiveConnectionSelector 
                                        selectedConnectionId={selectedConnectionId} 
                                        onConnectionSelect={handleConnectionSelect}
                                        compact
                                    />
                                </div>
                                
                                <div className="flex justify-end">
                                    <Button 
                                        onClick={handleReset} 
                                        disabled={selectedConnectionId === primaryConnectionId} 
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                    >
                                        <FiRefreshCw className="h-3 w-3 mr-1" />
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </div>
    );
}

export default SocketHeaderCompact; 