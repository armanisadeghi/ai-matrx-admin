import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, Shield, ShieldOff, Radio, CheckCircle, XCircle } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Label
} from '@/components/ui';
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import { AVAILABLE_SERVICES, SERVICE_TASKS } from "@/constants/socket-constants";

// Helper function to convert snake_case to Title Case
const formatTaskName = (taskName: string): string => {
    return taskName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

interface CompactSocketHeaderProps {
    socketHook: SocketHook;
    defaultService?: string;
    defaultTask?: string;
}

export function CompactSocketHeader({ socketHook, defaultService, defaultTask }: CompactSocketHeaderProps) {
    const {
        service,
        taskType,
        setService,
        setTaskType,
        isConnected,
        isAuthenticated,
        streamEnabled,
        isResponseActive,
        namespace,
        setNamespace,
        setStreamEnabled
    } = socketHook;
    
    const [availableTaskTypes, setAvailableTaskTypes] = useState<string[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (namespace !== "UserSession") {
            setNamespace("UserSession");
        }
        
        if (!streamEnabled) {
            setStreamEnabled(true);
        }
        
        setIsInitialized(true);
    }, []);

    useEffect(() => {
        if (!isInitialized) return;
        if(!defaultService) return;
        if (defaultService) {
            setService(defaultService);
        }
    }, [isInitialized, defaultService]);

    useEffect(() => {
        if (!isInitialized) return;
        if(!defaultTask) return;
        
        if (defaultTask) {
            setTaskType(defaultTask);
        }
    }, [isInitialized, defaultTask]);

    useEffect(() => {
        if (!service) {
            setAvailableTaskTypes([]);
            return;
        }
        
        if (service in SERVICE_TASKS) {
            const serviceTasks = SERVICE_TASKS[service as keyof typeof SERVICE_TASKS];
            setAvailableTaskTypes(Object.keys(serviceTasks));
        } else {
            setAvailableTaskTypes([]);
        }
    }, [service]);

    const handleServiceChange = (newService: string) => {
        if (newService !== service) {
            setService(newService);
            if (!defaultTask) {
                setTaskType("");
            }
        }
    };

    return (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm">
            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
                <div className={`${isConnected ? 'text-green-500' : 'text-red-500'}`} title="Connection Status">
                    {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                </div>
                <div className={`${isAuthenticated ? 'text-green-500' : 'text-red-500'}`} title="Authentication Status">
                    {isAuthenticated ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                </div>
                <div className={`${streamEnabled ? 'text-green-500' : 'text-gray-500'}`} title="Stream Enabled">
                    <Radio className="h-4 w-4" />
                </div>
                <div className={`${isResponseActive ? 'text-green-500' : 'text-red-500'}`} title="Response Status">
                    {isResponseActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
            </div>
            
            {/* Service and Task Display/Selection */}
            <div className="flex items-center space-x-2">
                {/* Service Display/Selection */}
                {defaultService ? (
                    <div className="h-8 min-w-32 flex items-center">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {AVAILABLE_SERVICES[defaultService as keyof typeof AVAILABLE_SERVICES] || defaultService}
                        </Label>
                    </div>
                ) : (
                    <Select
                        value={service}
                        onValueChange={handleServiceChange}
                    >
                        <SelectTrigger className="h-8 min-w-32 bg-transparent border-gray-300 dark:border-gray-700 rounded-md">
                            <SelectValue placeholder="Service" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AVAILABLE_SERVICES).map(([key, label]) => (
                                <SelectItem 
                                    key={key} 
                                    value={key} 
                                    className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                
                {/* Task Type Display/Selection */}
                {defaultTask ? (
                    <div className="h-8 min-w-32 flex items-center">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {formatTaskName(defaultTask)}
                        </Label>
                    </div>
                ) : (
                    <Select
                        value={taskType}
                        onValueChange={setTaskType}
                        disabled={!service}
                    >
                        <SelectTrigger className="h-8 min-w-32 bg-transparent border-gray-300 dark:border-gray-700 rounded-md">
                            <SelectValue placeholder="Task" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTaskTypes.map((taskName) => (
                                <SelectItem 
                                    key={taskName} 
                                    value={taskName} 
                                    className="bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    {formatTaskName(taskName)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </div>
    );
}

export default CompactSocketHeader;