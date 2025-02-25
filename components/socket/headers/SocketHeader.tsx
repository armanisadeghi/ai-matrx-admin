// File: components/socket/SocketHeader.tsx
import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Shield, ShieldOff, Radio, CheckCircle, XCircle } from 'lucide-react';
import {
    Input,
    Label,
    Switch,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui';


import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import { AVAILABLE_NAMESPACES, AVAILABLE_SERVICES, SERVICE_TASKS } from "@/constants/socket-constants";

interface StatusIndicatorProps {
    isActive: boolean;
    label: string;
    icon: {
        active: React.ReactNode;
        inactive: React.ReactNode;
    };
}

const StatusIndicator = ({ isActive, label, icon }: StatusIndicatorProps) => (
    <div className="flex items-center space-x-2">
        <div className={`${isActive ? 'text-green-500' : 'text-red-500'}`}>
            {isActive ? icon.active : icon.inactive}
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
    </div>
);

interface SocketHeaderProps {
    socketHook: SocketHook;
}

export function SocketHeader({ socketHook }: SocketHeaderProps) {
    const {
        namespace,
        service,
        taskType,
        streamEnabled,
        setNamespace,
        setService,
        setTaskType,
        setStreamEnabled,
        isConnected,
        isAuthenticated,
        isResponseActive,
    } = socketHook;

    const [customNamespace, setCustomNamespace] = useState(false);
    const [availableTaskTypes, setAvailableTaskTypes] = useState<string[]>([]);

    // Update available task types when service changes
    useEffect(() => {
        if (service && service in SERVICE_TASKS) {
            const serviceTasks = SERVICE_TASKS[service as keyof typeof SERVICE_TASKS];
            setAvailableTaskTypes(Object.keys(serviceTasks));
        } else {
            setAvailableTaskTypes([]);
        }
    }, [service]);

    return (
        <div className="p-4 pb-6 space-y-4 bg-gray-200 dark:bg-gray-900 border-3 border-gray-300 dark:border-gray-600 rounded-3xl">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex space-x-4">
                    <h3 className="text-lg font-bold pr-6">Matrx Admin Socket.IO Tester</h3>
                    <StatusIndicator
                        isActive={isConnected}
                        label="Connected"
                        icon={{
                            active: <Wifi className="h-4 w-4" />,
                            inactive: <WifiOff className="h-4 w-4" />
                        }}
                    />
                    <StatusIndicator
                        isActive={isAuthenticated}
                        label="Authenticated"
                        icon={{
                            active: <Shield className="h-4 w-4" />,
                            inactive: <ShieldOff className="h-4 w-4" />
                        }}
                    />
                    <StatusIndicator
                        isActive={streamEnabled}
                        label="Stream Enabled"
                        icon={{
                            active: <Radio className="h-4 w-4" />,
                            inactive: <Radio className="h-4 w-4" />
                        }}
                    />
                    <StatusIndicator
                        isActive={isResponseActive}
                        label="Response Active"
                        icon={{
                            active: <CheckCircle className="h-4 w-4" />,
                            inactive: <XCircle className="h-4 w-4" />
                        }}
                    />
                </div>
                <div className="flex items-center space-x-2">
                    <Switch
                        checked={streamEnabled}
                        onCheckedChange={setStreamEnabled}
                    />
                    <Label>Enable Streaming</Label>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {/* Namespace Selection */}
                <div className="space-y-2">
                    <Label>Namespace</Label>
                    {customNamespace ? (
                        <Input
                            value={namespace}
                            onChange={(e) => setNamespace(e.target.value)}
                            className="mt-1"
                        />
                    ) : (
                        <Select
                            value={namespace}
                            onValueChange={(value) => {
                                if (value === 'custom') {
                                    setCustomNamespace(true);
                                } else {
                                    setNamespace(value);
                                }
                            }}
                        >
                            <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                                <SelectValue placeholder="Select namespace..." />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.entries(AVAILABLE_NAMESPACES).map(([key, label]) => (
                                    <SelectItem 
                                        key={key} 
                                        value={key} 
                                        className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                    >
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Service Selection */}
                <div className="space-y-2">
                    <Label>Service</Label>
                    <Select
                        value={service}
                        onValueChange={(value) => {
                            setService(value);
                            setTaskType(""); // Reset task type when service changes
                        }}
                    >
                        <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                            <SelectValue placeholder="Select service..." />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(AVAILABLE_SERVICES).map(([key, label]) => (
                                <SelectItem 
                                    key={key} 
                                    value={key} 
                                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Task Type Selection */}
                <div className="space-y-2">
                    <Label>Task Type</Label>
                    <Select
                        value={taskType}
                        onValueChange={setTaskType}
                        disabled={!service}
                    >
                        <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                            <SelectValue placeholder={service ? "Select task type..." : "Select service first"} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTaskTypes.map((taskName) => (
                                <SelectItem 
                                    key={taskName} 
                                    value={taskName} 
                                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    {taskName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}

export default SocketHeader;