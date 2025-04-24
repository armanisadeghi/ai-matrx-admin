import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, Shield, ShieldOff, Radio, CheckCircle, XCircle } from "lucide-react";
import { Input, Label, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from "@/components/ui";
import { SocketHook } from "@/lib/redux/socket/hooks/useSocket";
import { getAvailableServices, getTasksForService, getAvailableNamespaces } from "@/constants/socket-schema";
import { FiRefreshCw } from "react-icons/fi";

interface StatusIndicatorProps {
    isActive: boolean;
    label: string;
    icon: {
        active: React.ReactNode;
        inactive: React.ReactNode;
    };
}

const StatusIndicator = ({ isActive, label, icon }: StatusIndicatorProps) => (
    <div className="flex items-center space-x-1">
        <div className={`${isActive ? "text-green-500" : "text-red-500"}`}>{isActive ? icon.active : icon.inactive}</div>
        <span className="text-sm text-muted-foreground">{label}</span>
    </div>
);

interface SocketHeaderProps {
    socketHook: SocketHook;
    testMode?: boolean;
    onTestModeChange?: (testMode: boolean) => void;
}

export function SocketHeader({ socketHook, testMode, onTestModeChange }: SocketHeaderProps) {
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

    const [customNamespace, setCustomNamespace] = useState(false);
    const [customNamespaceValue, setCustomNamespaceValue] = useState(namespace);
    const [availableServers, setAvailableServers] = useState<string[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);

    // Fetch and normalize available servers
    useEffect(() => {
        const fetchServers = async () => {
            const servers = await getAvailableServers();
            const normalizedServers = [...new Set((servers as string[]).map((server) => server.trim().toLowerCase()))];
            console.log("[SOCKET] InitialAvailable servers:", normalizedServers);

            // Always ensure "http://localhost:8000" is included
            if (!normalizedServers.includes("http://localhost:8000")) {
                normalizedServers.push("http://localhost:8000");
            }

            console.log("[SOCKET] Final Available servers:", normalizedServers);

            setAvailableServers(normalizedServers);
        };
        fetchServers();
    }, [getAvailableServers]);

    useEffect(() => {
        setCustomNamespaceValue(namespace);
    }, [namespace]);

    useEffect(() => {
        setSelectedServer(currentServer ? currentServer.trim().toLowerCase() : null);
    }, [currentServer]);

    // Handle server override
    const handleServerChange = (value: string) => {
        if (value) {
            const normalizedServer = value.trim().toLowerCase();
            connectToServer(normalizedServer);
            setSelectedServer(normalizedServer);
        }
    };

    // Handle namespace override
    const handleNamespaceChange = (value: string) => {
        if (value === "custom") {
            setCustomNamespace(true);
        } else {
            setCustomNamespace(false);
            overrideNamespace(value);
            setCustomNamespaceValue(value);
        }
    };

    // Handle custom namespace submission
    const handleCustomNamespaceSubmit = () => {
        if (customNamespaceValue) {
            overrideNamespace(customNamespaceValue);
        }
    };

    // Handle reset to defaults
    const handleReset = () => {
        clearServerOverride();
        setCustomNamespace(false);
        setCustomNamespaceValue("/UserSession");
        setSelectedServer(null);
    };

    return (
        <div className="p-4 pb-6 space-y-4 bg-gray-200 dark:bg-gray-900 border-3 border-gray-300 dark:border-gray-600 rounded-3xl">
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex space-x-3">
                    <h3 className="text-lg font-bold pr-4">Matrx Admin Socket.IO Tester</h3>
                    <StatusIndicator
                        isActive={isConnected}
                        label="Connected"
                        icon={{
                            active: <Wifi className="h-4 w-4" />,
                            inactive: <WifiOff className="h-4 w-4" />,
                        }}
                    />
                    <StatusIndicator
                        isActive={isAuthenticated}
                        label="Authenticated"
                        icon={{
                            active: <Shield className="h-4 w-4" />,
                            inactive: <ShieldOff className="h-4 w-4" />,
                        }}
                    />
                    <StatusIndicator
                        isActive={streamEnabled}
                        label="Stream Enabled"
                        icon={{
                            active: <Radio className="h-4 w-4" />,
                            inactive: <Radio className="h-4 w-4" />,
                        }}
                    />
                    <StatusIndicator
                        isActive={isResponseActive}
                        label="Response Active"
                        icon={{
                            active: <CheckCircle className="h-4 w-4" />,
                            inactive: <XCircle className="h-4 w-4" />,
                        }}
                    />
                </div>
                <div className="flex items-center space-x-4">
                    <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
                    <Label>Streaming</Label>
                    <Switch checked={testMode} onCheckedChange={onTestModeChange} />
                    <Label>Test Mode</Label>
                    <Button onClick={handleReset} disabled={namespace === "/UserSession" && !selectedServer} variant="ghost">
                        <FiRefreshCw className="h-4 w-4" />
                        Reset
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-4 gap-3">
                {/* Namespace Selection */}
                <div>
                    {customNamespace ? (
                        <div className="flex space-x-2">
                            <Input
                                value={namespace}
                                onChange={(e) => setCustomNamespaceValue(e.target.value)}
                                placeholder="Enter namespace (e.g., /CustomNamespace)"
                            />
                            <Button onClick={handleCustomNamespaceSubmit} disabled={!customNamespaceValue}>
                                Apply
                            </Button>
                            <Button onClick={handleReset} disabled={namespace === "/UserSession" && !selectedServer} variant="ghost">
                                <FiRefreshCw className="h-4 w-4" />
                                Reset
                            </Button>
                        </div>
                    ) : (
                        <Select value={namespace} onValueChange={handleNamespaceChange}>
                            <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                                <SelectValue placeholder="Select a namespace..." />
                            </SelectTrigger>
                            <SelectContent>
                                {getAvailableNamespaces().map(({ value, label }, index) => (
                                    <SelectItem
                                        key={`${value}-${index}`}
                                        value={value}
                                        className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                    >
                                        {label}
                                    </SelectItem>
                                ))}
                                <SelectItem
                                    value="custom"
                                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    Custom
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Server Selection */}
                <div>
                    <Select value={selectedServer || ""} onValueChange={handleServerChange}>
                        <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                            <SelectValue placeholder="Select a server..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableServers.map((server, index) => (
                                <SelectItem
                                    key={`${server}-${index}`}
                                    value={server}
                                    className="bg-gray-200 dark:bg-gray-900 hover:bg-gray-300 dark:hover:bg-gray-800 cursor-pointer"
                                >
                                    {server}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Service Selection */}
                <div>
                    <Select
                        value={service}
                        onValueChange={(value) => {
                            setService(value);
                            setTaskType(""); // Reset task type when service changes
                        }}
                    >
                        <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                            <SelectValue placeholder="Select a service..." />
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
                </div>

                {/* Task Type Selection */}
                <div>
                    <Select value={taskType} onValueChange={setTaskType} disabled={!service}>
                        <SelectTrigger className="bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500 rounded-3xl">
                            <SelectValue placeholder={service ? "Select a task type..." : "Select service first"} />
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
                </div>
            </div>
        </div>
    );
}
