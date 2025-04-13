import React from "react";
import { Wifi, WifiOff, Shield, ShieldOff, Radio, CheckCircle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label } from "@/components/ui";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import { getAvailableServices, getTasksForService, getAvailableNamespaces } from "@/constants/socket-schema";

// Helper function to convert snake_case to Title Case
const formatTaskName = (taskName: string): string => {
    return taskName
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
};

interface CompactSocketHeaderProps {
    socketHook: SocketHook;
    defaultService?: string;
    defaultTask?: string;
}

export function CompactSocketHeader({ socketHook, defaultService, defaultTask }: CompactSocketHeaderProps) {
    const {
        namespace,
        service,
        taskType,
        streamEnabled,
        setService,
        setTaskType,
        setStreamEnabled,
        isConnected,
        isAuthenticated,
        isResponseActive,
        getAvailableServers,
        connectToServer,
        overrideNamespace,
        clearServerOverride,
        currentServer,
    } = socketHook;

    return (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm">
            {/* Status Indicators */}
            <div className="flex items-center space-x-2">
                <div className={`${isConnected ? "text-green-500" : "text-red-500"}`} title="Connection Status">
                    {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                </div>
                <div className={`${isAuthenticated ? "text-green-500" : "text-red-500"}`} title="Authentication Status">
                    {isAuthenticated ? <Shield className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
                </div>
                <div className={`${streamEnabled ? "text-green-500" : "text-gray-500"}`} title="Stream Enabled">
                    <Radio className="h-4 w-4" />
                </div>
                <div className={`${isResponseActive ? "text-green-500" : "text-red-500"}`} title="Response Status">
                    {isResponseActive ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
            </div>

            {/* Service and Task Display/Selection */}
            <div className="flex items-center space-x-2">
                {/* Service Display/Selection */}
                {defaultService ? (
                    <div className="h-8 min-w-32 flex items-center">
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {getAvailableServices[defaultService as keyof typeof getAvailableServices] || defaultService}
                        </Label>
                    </div>
                ) : (
                    <Select
                        value={service}
                        onValueChange={(value) => {
                            setService(value);
                            setTaskType("");
                        }}
                    >
                        <SelectTrigger className="h-8 min-w-32 bg-transparent border-gray-300 dark:border-gray-700 rounded-md">
                            <SelectValue placeholder="Service" />
                        </SelectTrigger>
                        <SelectContent>
                            {getAvailableServices().map(({ value, label }) => (
                                <SelectItem
                                    key={value}
                                    value={value}
                                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
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
                        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatTaskName(defaultTask)}</Label>
                    </div>
                ) : (
                    <Select value={taskType} onValueChange={setTaskType} disabled={!service}>
                        <SelectTrigger className="h-8 min-w-32 bg-transparent border-gray-300 dark:border-gray-700 rounded-md">
                            <SelectValue placeholder="Task" />
                        </SelectTrigger>
                        <SelectContent>
                            {getTasksForService(service).map(({ value, label }) => (
                                <SelectItem
                                    key={`${service}-${value}`}
                                    value={value}
                                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    {label}
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
