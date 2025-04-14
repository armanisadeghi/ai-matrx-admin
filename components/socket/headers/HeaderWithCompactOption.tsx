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
    compact?: boolean;
}

const StatusIndicator = ({ isActive, label, icon, compact }: StatusIndicatorProps) => (
    <div className="flex items-center space-x-2">
        <div className={`${isActive ? "text-green-500" : "text-red-500"}`}>
            {isActive ? icon.active : icon.inactive}
        </div>
        {!compact && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
);

interface SocketHeaderProps {
    socketHook: SocketHook;
    isCompact?: boolean;
}

export function SocketHeader({ socketHook, isCompact = false }: SocketHeaderProps) {
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
    const [showControls, setShowControls] = useState(!isCompact);
    
    // Fetch and normalize available servers
    useEffect(() => {
        const fetchServers = async () => {
            const servers = await getAvailableServers();
            const normalizedServers = [...new Set((servers as string[]).map((server) => server.trim().toLowerCase()))];
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
        <div 
            className={`transition-all duration-300 
                ${isCompact 
                    ? "py-2 px-4 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 rounded-none sticky top-0 z-10" 
                    : "p-4 pb-6 space-y-4 bg-gray-200 dark:bg-gray-900 border-3 border-gray-300 dark:border-gray-600 rounded-3xl"
                }`}
        >
            <div className="flex flex-wrap gap-4 justify-between items-center">
                <div className="flex space-x-4">
                    <h3 className={`font-bold ${isCompact ? "text-base" : "text-lg"} pr-6`}>
                        {isCompact ? "Socket Tester" : "Matrx Admin Socket.IO Tester"}
                    </h3>
                    <div className="flex space-x-3">
                        <StatusIndicator
                            isActive={isConnected}
                            label="Connected"
                            icon={{
                                active: <Wifi className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                                inactive: <WifiOff className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                            }}
                            compact={isCompact}
                        />
                        <StatusIndicator
                            isActive={isAuthenticated}
                            label="Authenticated"
                            icon={{
                                active: <Shield className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                                inactive: <ShieldOff className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                            }}
                            compact={isCompact}
                        />
                        <StatusIndicator
                            isActive={streamEnabled}
                            label="Stream Enabled"
                            icon={{
                                active: <Radio className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                                inactive: <Radio className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                            }}
                            compact={isCompact}
                        />
                        <StatusIndicator
                            isActive={isResponseActive}
                            label="Response Active"
                            icon={{
                                active: <CheckCircle className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                                inactive: <XCircle className={`${isCompact ? "h-3 w-3" : "h-4 w-4"}`} />,
                            }}
                            compact={isCompact}
                        />
                    </div>
                </div>
                
                <div className="flex items-center space-x-4">
                    {isCompact ? (
                        <Button 
                            onClick={() => setShowControls(!showControls)} 
                            size="sm" 
                            variant="outline"
                            className="text-xs px-2 py-1"
                        >
                            {showControls ? "Hide Controls" : "Show Controls"}
                        </Button>
                    ) : (
                        <>
                            <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
                            <Label>Streaming</Label>
                            <Button onClick={handleReset} disabled={namespace === "/UserSession" && !selectedServer} variant="ghost">
                                <FiRefreshCw className="h-4 w-4" />
                                Reset
                            </Button>
                        </>
                    )}
                </div>
            </div>
            
            {(showControls || !isCompact) && (
                <div className={`grid md:grid-cols-4 gap-4 ${isCompact ? "mt-3 pb-2" : ""}`}>
                    {/* Namespace Selection */}
                    <div className="space-y-2">
                        <Label className={isCompact ? "text-xs" : ""}>Namespace</Label>
                        {customNamespace ? (
                            <div className="flex space-x-2">
                                <Input
                                    value={namespace}
                                    onChange={(e) => setCustomNamespaceValue(e.target.value)}
                                    placeholder="Enter namespace (e.g., /CustomNamespace)"
                                    className={`${isCompact ? "h-7 text-xs" : "mt-1"}`}
                                />
                                <Button 
                                    onClick={handleCustomNamespaceSubmit} 
                                    disabled={!customNamespaceValue}
                                    className={isCompact ? "h-7 text-xs px-2" : ""}
                                    size={isCompact ? "sm" : "default"}
                                >
                                    Apply
                                </Button>
                                <Button 
                                    onClick={handleReset} 
                                    disabled={namespace === "/UserSession" && !selectedServer}
                                    className={isCompact ? "h-7 text-xs px-2" : ""}
                                    size={isCompact ? "sm" : "default"}
                                >
                                    Reset
                                </Button>
                            </div>
                        ) : (
                            <Select value={namespace} onValueChange={handleNamespaceChange}>
                                <SelectTrigger className={`
                                    bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500
                                    ${isCompact ? "h-7 text-xs rounded-xl" : "rounded-3xl"}
                                `}>
                                    <SelectValue placeholder="Select namespace..." />
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
                    <div className="space-y-2">
                        <Label className={isCompact ? "text-xs" : ""}>Server</Label>
                        <Select value={selectedServer || ""} onValueChange={handleServerChange}>
                            <SelectTrigger className={`
                                bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500
                                ${isCompact ? "h-7 text-xs rounded-xl" : "rounded-3xl"}
                            `}>
                                <SelectValue placeholder="Select server..." />
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
                    <div className="space-y-2">
                        <Label className={isCompact ? "text-xs" : ""}>Service</Label>
                        <Select
                            value={service}
                            onValueChange={(value) => {
                                setService(value);
                                setTaskType(""); // Reset task type when service changes
                            }}
                        >
                            <SelectTrigger className={`
                                bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500
                                ${isCompact ? "h-7 text-xs rounded-xl" : "rounded-3xl"}
                            `}>
                                <SelectValue placeholder="Select service..." />
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
                    <div className="space-y-2">
                        <Label className={isCompact ? "text-xs" : ""}>Task Type</Label>
                        <Select value={taskType} onValueChange={setTaskType} disabled={!service}>
                            <SelectTrigger className={`
                                bg-gray-200 dark:bg-gray-900 border-1 border-gray-400 dark:border-gray-500
                                ${isCompact ? "h-7 text-xs rounded-xl" : "rounded-3xl"}
                            `}>
                                <SelectValue placeholder={service ? "Select task type..." : "Select service first"} />
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
                    
                    {/* Additional compact mode controls */}
                    {isCompact && (
                        <div className="space-y-2 flex items-center space-x-4 md:col-span-4">
                            <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} />
                            <Label className="text-xs">Enable Streaming</Label>
                            <Button 
                                onClick={handleReset} 
                                disabled={namespace === "/UserSession" && !selectedServer} 
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                            >
                                <FiRefreshCw className="h-3 w-3 mr-1" />
                                Reset
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default SocketHeader;