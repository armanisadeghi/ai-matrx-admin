// components/admin/MediumIndicator.tsx
import React, { useState, useEffect, useRef } from "react";
import {
    ChevronRight,
    ChevronDown,
    Move,
    User,
    Server,
    Wifi,
    WifiOff,
    Shield,
    ShieldOff,
    RefreshCw,
    AlertCircle,
    Loader2,
} from "lucide-react";
import { PiPathFill } from "react-icons/pi";
import { usePathname } from "next/navigation";
import { debugModules } from "@/components/admin/debug/debugModuleRegistry";
import DebugModulePanel from "@/components/admin/debug/DebugModulePanel";
import { getAvailableNamespaces } from "@/constants/socket-schema";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";
import { toggleDebugMode, selectIsDebugMode } from "@/lib/redux/slices/adminDebugSlice";
import { SocketConnectionManager } from "@/lib/redux/socket-io/connection/socketConnectionManager";
import {
    setConnection,
    setPrimaryConnection,
    setConnectionStatus,
    disconnectConnection,
    reconnectConnection,
    setConnectionError,
    setReconnecting,
    toggleTestMode,
    changeConnectionUrl,
    changeNamespace,
} from "@/lib/redux/socket-io/slices/socketConnectionsSlice";
import {
    selectPrimaryConnection,
    selectAllConnectionsHealth,
    selectIsAdmin,
    selectAuthToken,
    selectConnectionTestMode,
    selectConnectionHealth,
    selectAnyConnectionReconnecting,
} from "@/lib/redux/socket-io/selectors/socket-connection-selectors";

// Status Indicator Component
interface StatusIndicatorProps {
    isActive: boolean;
    icon: {
        active: React.ReactNode;
        inactive: React.ReactNode;
    };
    tooltip: string;
    onClick?: () => void;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isActive, icon, tooltip, onClick }) => (
    <div
        className={`flex items-center justify-center w-6 h-6 rounded ${isActive ? "text-green-500" : "text-red-500"} ${
            onClick ? "cursor-pointer hover:bg-slate-700" : ""
        }`}
        title={tooltip}
        onClick={onClick}
    >
        {isActive ? icon.active : icon.inactive}
    </div>
);

interface User {
    id: string;
    email?: string;
    name?: string;
    userMetadata?: {
        fullName: string;
    };
    [key: string]: any;
}

interface MediumIndicatorProps {
    user: User;
    onDragStart: (e: React.MouseEvent) => void;
    onSizeUp: () => void;
    onSizeDown: () => void;
}

const MediumIndicator: React.FC<MediumIndicatorProps> = ({ user, onDragStart, onSizeUp, onSizeDown }) => {
    const currentPath = usePathname();
    const [showServerDropdown, setShowServerDropdown] = useState(false);
    const [showNamespaceDropdown, setShowNamespaceDropdown] = useState(false);
    const [showConnectionDetails, setShowConnectionDetails] = useState(false);
    const [activeDebugModule, setActiveDebugModule] = useState<string | null>(null);
    const serverButtonRef = useRef<HTMLDivElement>(null);
    const serverDropdownRef = useRef<HTMLDivElement>(null);
    const namespaceButtonRef = useRef<HTMLDivElement>(null);
    const namespaceDropdownRef = useRef<HTMLDivElement>(null);

    const dispatch = useAppDispatch();

    // Redux selectors
    const primaryConnection = useAppSelector(selectPrimaryConnection);
    const allConnectionsHealth = useAppSelector(selectAllConnectionsHealth);
    const isAdmin = useAppSelector(selectIsAdmin);
    const authToken = useAppSelector(selectAuthToken);
    const testMode = useAppSelector(selectConnectionTestMode);
    const anyReconnecting = useAppSelector(selectAnyConnectionReconnecting);

    // Global debug mode from adminDebug slice
    const isDebugMode = useAppSelector(selectIsDebugMode);
    
    // Chat selectors (kept for compatibility with chat-specific features)
    const chatActions = getChatActionsWithThunks();
    const chatSelectors = createChatSelectors();
    const isChatDebugMode = useAppSelector(chatSelectors.isDebugMode);

    // Get connection health for primary connection
    const primaryHealth = useAppSelector((state) => selectConnectionHealth(state, primaryConnection?.connectionId || "primary"));

    const socketManager = SocketConnectionManager.getInstance();

    // Predefined connections
    const predefinedConnections = SocketConnectionManager.getPredefinedConnections();

    const handleToggleDebugMode = () => {
        // Toggle global debug mode
        dispatch(toggleDebugMode());
        
        // Also sync with chat debug mode for backward compatibility
        dispatch(chatActions.setChatDebugMode({ isDebugMode: !isDebugMode }));
    };

    const handleToggleTestMode = () => {
        dispatch(toggleTestMode());
    };

    const handleContainerMouseDown = (e: React.MouseEvent) => {
        if (e.currentTarget === e.target) {
            onDragStart(e);
        }
    };

    // Handle reconnection
    const handleReconnect = async () => {
        if (!primaryConnection) return;

        dispatch(setReconnecting({ connectionId: primaryConnection.connectionId, isReconnecting: true }));
        dispatch(reconnectConnection(primaryConnection.connectionId));

        try {
            const socket = await socketManager.reconnect(primaryConnection.connectionId);

            if (socket) {
                dispatch(
                    setConnection({
                        ...primaryConnection,
                        socket,
                        connectionStatus: "connected",
                        isAuthenticated: true,
                    })
                );
            } else {
                dispatch(
                    setConnectionError({
                        connectionId: primaryConnection.connectionId,
                        error: "Failed to reconnect",
                    })
                );
            }
        } catch (error) {
            dispatch(
                setConnectionError({
                    connectionId: primaryConnection.connectionId,
                    error: error instanceof Error ? error.message : "Reconnection failed",
                })
            );
        } finally {
            dispatch(setReconnecting({ connectionId: primaryConnection.connectionId, isReconnecting: false }));
        }
    };

    // Handle server change
    const handleServerChange = async (url: string) => {
        if (!primaryConnection) return;

        // If it's the same URL, just close dropdown
        if (url === primaryConnection.url) {
            setShowServerDropdown(false);
            return;
        }

        // Disconnect current connection
        socketManager.disconnect(primaryConnection.connectionId);
        dispatch(disconnectConnection(primaryConnection.connectionId));

        // Update the URL
        dispatch(changeConnectionUrl({ connectionId: primaryConnection.connectionId, url }));

        // Reconnect with new URL
        try {
            const socket = await socketManager.getSocket(primaryConnection.connectionId, url, primaryConnection.namespace);

            if (socket) {
                dispatch(
                    setConnection({
                        ...primaryConnection,
                        url,
                        socket,
                        connectionStatus: "connected",
                        isAuthenticated: true,
                    })
                );
            }
        } catch (error) {
            dispatch(
                setConnectionError({
                    connectionId: primaryConnection.connectionId,
                    error: `Failed to connect to ${url}`,
                })
            );
        }

        setShowServerDropdown(false);
    };

    // Handle namespace change
    const handleNamespaceChange = async (namespace: string) => {
        if (!primaryConnection) return;

        // If it's the same namespace, just close dropdown
        if (namespace === primaryConnection.namespace) {
            setShowNamespaceDropdown(false);
            return;
        }

        // Disconnect current connection
        socketManager.disconnect(primaryConnection.connectionId);
        dispatch(disconnectConnection(primaryConnection.connectionId));

        // Update the namespace
        dispatch(changeNamespace({ connectionId: primaryConnection.connectionId, namespace }));

        // Reconnect with new namespace
        try {
            const socket = await socketManager.getSocket(primaryConnection.connectionId, primaryConnection.url, namespace);

            if (socket) {
                dispatch(
                    setConnection({
                        ...primaryConnection,
                        namespace,
                        socket,
                        connectionStatus: "connected",
                        isAuthenticated: true,
                    })
                );
            }
        } catch (error) {
            dispatch(
                setConnectionError({
                    connectionId: primaryConnection.connectionId,
                    error: `Failed to connect to namespace ${namespace}`,
                })
            );
        }

        setShowNamespaceDropdown(false);
    };

    // Handle reset to default
    const handleResetToDefault = async () => {
        if (!primaryConnection) return;

        const defaultUrl =
            isAdmin && (await socketManager.isLocalServerAvailable())
                ? SocketConnectionManager.LOCAL_URL
                : SocketConnectionManager.DEFAULT_URL;

        const defaultNamespace = SocketConnectionManager.DEFAULT_NAMESPACE;

        if (primaryConnection.url === defaultUrl && primaryConnection.namespace === defaultNamespace) {
            return; // Already at defaults
        }

        // Disconnect and reconnect with defaults
        socketManager.disconnect(primaryConnection.connectionId);
        dispatch(disconnectConnection(primaryConnection.connectionId));

        try {
            const socket = await socketManager.getSocket(primaryConnection.connectionId, defaultUrl, defaultNamespace);

            if (socket) {
                dispatch(
                    setConnection({
                        connectionId: primaryConnection.connectionId,
                        url: defaultUrl,
                        namespace: defaultNamespace,
                        socket,
                        connectionStatus: "connected",
                        isAuthenticated: true,
                    })
                );
            }
        } catch (error) {
            dispatch(
                setConnectionError({
                    connectionId: primaryConnection.connectionId,
                    error: "Failed to reset to defaults",
                })
            );
        }
    };

    // Handle click outside to close dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                showServerDropdown &&
                serverDropdownRef.current &&
                serverButtonRef.current &&
                !serverDropdownRef.current.contains(event.target as Node) &&
                !serverButtonRef.current.contains(event.target as Node)
            ) {
                setShowServerDropdown(false);
            }

            if (
                showNamespaceDropdown &&
                namespaceDropdownRef.current &&
                namespaceButtonRef.current &&
                !namespaceDropdownRef.current.contains(event.target as Node) &&
                !namespaceButtonRef.current.contains(event.target as Node)
            ) {
                setShowNamespaceDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showServerDropdown, showNamespaceDropdown]);

    // Position dropdowns correctly
    useEffect(() => {
        if (showServerDropdown && serverButtonRef.current && serverDropdownRef.current) {
            const buttonRect = serverButtonRef.current.getBoundingClientRect();
            serverDropdownRef.current.style.left = `${buttonRect.left}px`;
            serverDropdownRef.current.style.top = `${buttonRect.bottom + 5}px`;

            setTimeout(() => {
                if (serverDropdownRef.current) {
                    const contentWidth = serverDropdownRef.current.scrollWidth + 10;
                    const availableWidth = window.innerWidth - buttonRect.left - 20;
                    const finalWidth = Math.min(contentWidth, availableWidth);
                    serverDropdownRef.current.style.width = `${finalWidth}px`;
                }
            }, 0);
        }

        if (showNamespaceDropdown && namespaceButtonRef.current && namespaceDropdownRef.current) {
            const buttonRect = namespaceButtonRef.current.getBoundingClientRect();
            namespaceDropdownRef.current.style.left = `${buttonRect.left}px`;
            namespaceDropdownRef.current.style.top = `${buttonRect.bottom + 5}px`;

            setTimeout(() => {
                if (namespaceDropdownRef.current) {
                    const contentWidth = namespaceDropdownRef.current.scrollWidth + 10;
                    const availableWidth = window.innerWidth - buttonRect.left - 20;
                    const finalWidth = Math.min(contentWidth, availableWidth);
                    namespaceDropdownRef.current.style.width = `${finalWidth}px`;
                }
            }, 0);
        }
    }, [showServerDropdown, showNamespaceDropdown]);

    // Get current server display
    const currentServer = primaryConnection?.url || "Not connected";
    const isConnected = primaryConnection?.connectionStatus === "connected";
    const isAuthenticated = primaryConnection?.isAuthenticated || false;

    return (
        <div
            className="flex flex-col w-96 rounded-lg bg-slate-800 text-white shadow-lg overflow-visible"
            onMouseDown={handleContainerMouseDown}
        >
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-1 bg-slate-900">
                <div className="font-semibold text-sm">Matrx Admin</div>
                <div className="flex items-center gap-1">
                    <div className="cursor-move p-1 rounded hover:bg-slate-700" onMouseDown={onDragStart}>
                        <Move size={14} />
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSizeDown();
                        }}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <ChevronRight size={14} className="rotate-180" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSizeUp();
                        }}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <ChevronDown size={14} />
                    </button>
                </div>
            </div>

            {/* Status Indicators Row */}
            <div className="flex items-center justify-between px-2 py-1 bg-slate-900/50">
                <div className="flex items-center space-x-1">
                    <StatusIndicator
                        isActive={isConnected}
                        icon={{
                            active: <Wifi size={14} />,
                            inactive: <WifiOff size={14} />,
                        }}
                        tooltip={isConnected ? "Connected" : "Disconnected"}
                        onClick={!isConnected ? handleReconnect : undefined}
                    />
                    <StatusIndicator
                        isActive={isAuthenticated}
                        icon={{
                            active: <Shield size={14} />,
                            inactive: <ShieldOff size={14} />,
                        }}
                        tooltip={isAuthenticated ? "Authenticated" : "Not Authenticated"}
                    />
                    {primaryHealth.error && (
                        <div className="text-red-400 flex items-center" title={primaryHealth.error}>
                            <AlertCircle size={14} />
                        </div>
                    )}
                    {anyReconnecting && (
                        <div className="text-yellow-400 flex items-center" title="Reconnecting...">
                            <Loader2 size={14} className="animate-spin" />
                        </div>
                    )}
                </div>
                <div className="flex items-center space-x-1">
                    <button
                        onClick={handleToggleDebugMode}
                        className={`px-2 py-0.5 text-xs rounded ${isDebugMode ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"}`}
                        title="Toggle Debug Mode"
                    >
                        Debug
                    </button>
                    <button
                        onClick={handleToggleTestMode}
                        className={`px-2 py-0.5 text-xs rounded ${testMode ? "bg-yellow-600 text-white" : "bg-slate-600 text-slate-300"}`}
                        title="Toggle Test Mode"
                    >
                        Test
                    </button>
                    <button onClick={handleResetToDefault} className="p-1 rounded hover:bg-slate-700" title="Reset to Default">
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Debug Modules Row */}
            {debugModules.length > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-slate-900/30 border-t border-slate-700/50">
                    <span className="text-[10px] text-slate-400 mr-1">Debug:</span>
                    {debugModules.map((module) => {
                        const Icon = module.icon;
                        return (
                            <button
                                key={module.id}
                                onClick={() => setActiveDebugModule(module.id)}
                                className={`p-1 rounded hover:bg-slate-700 transition-colors ${
                                    activeDebugModule === module.id ? 'bg-slate-700' : ''
                                } ${module.color || 'text-slate-300'}`}
                                title={`${module.name}: ${module.description}`}
                            >
                                <Icon size={12} />
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Main Content */}
            <div className="px-2 py-1 text-xs space-y-1">
                {/* User Info */}
                <div className="flex items-center justify-between gap-2">
                    <User size={16} />
                    <span className="text-blue-400 truncate flex-1 text-right">
                        {user.email || user.id}
                        {isAdmin && <span className="text-green-400 ml-1">(Admin)</span>}
                    </span>
                </div>

                {/* Server Selection */}
                <div className="relative">
                    <div
                        ref={serverButtonRef}
                        className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded"
                        onClick={() => {
                            setShowServerDropdown(!showServerDropdown);
                            setShowNamespaceDropdown(false);
                        }}
                    >
                        <Server size={16} />
                        <span
                            className={
                                !isConnected || primaryHealth.error
                                    ? "text-red-400"
                                    : currentServer?.includes("localhost")
                                    ? "text-green-400"
                                    : "text-blue-400"
                            }
                            title={currentServer}
                        >
                            {currentServer}
                        </span>
                    </div>
                </div>

                {/* Namespace Selection */}
                <div className="relative">
                    <div
                        ref={namespaceButtonRef}
                        className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded"
                        onClick={() => {
                            setShowNamespaceDropdown(!showNamespaceDropdown);
                            setShowServerDropdown(false);
                        }}
                    >
                        <PiPathFill size={16} />
                        <span className="text-blue-400 truncate text-right" title={primaryConnection?.namespace || ""}>
                            {primaryConnection?.namespace || "/UserSession"}
                        </span>
                    </div>
                </div>

                {/* Connection Stats */}
                <div
                    className="flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded text-slate-400"
                    onClick={() => setShowConnectionDetails(!showConnectionDetails)}
                >
                    <span className="text-xs">Connection Stats</span>
                    <ChevronRight size={12} className={showConnectionDetails ? "rotate-90" : ""} />
                </div>

                {showConnectionDetails && (
                    <div className="pl-4 space-y-1 text-xs text-slate-400">
                        <div className="flex justify-between">
                            <span>Attempts:</span>
                            <span>{primaryHealth.attempts}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Active Connections:</span>
                            <span>
                                {allConnectionsHealth.filter((c) => c.isHealthy).length}/{allConnectionsHealth.length}
                            </span>
                        </div>
                        {authToken && (
                            <div className="flex justify-between">
                                <span>Auth Token:</span>
                                <span className="text-green-400">Present</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Current Path */}
                <div className="flex items-start justify-between gap-2">
                    <PiPathFill size={16} className="text-slate-400" />
                    <div className="text-xs font-semibold text-slate-400 flex flex-col items-end" title={currentPath}>
                        {currentPath
                            .split("/")
                            .filter((part) => part)
                            .map((part, index) => (
                                <span key={index} className="text-slate-400">
                                    {part}
                                </span>
                            ))}
                    </div>
                </div>
            </div>

            {/* Server Dropdown */}
            {showServerDropdown && (
                <div
                    ref={serverDropdownRef}
                    className="fixed bg-slate-900 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
                    style={{
                        minWidth: "180px",
                        maxWidth: "500px",
                        width: "auto",
                    }}
                >
                    <div className="text-xs font-semibold px-2 py-1 text-slate-400 sticky top-0 bg-slate-900 border-b border-slate-700">
                        Select Server
                    </div>
                    {predefinedConnections.map((conn, index) => (
                        <div
                            key={`${conn.url}-${index}`}
                            className={`px-2 py-1 text-xs cursor-pointer hover:bg-slate-700 text-left whitespace-nowrap ${
                                conn.url === currentServer ? "text-green-400" : "text-white"
                            }`}
                            onClick={() => handleServerChange(conn.url)}
                        >
                            {conn.name} - {conn.url}
                        </div>
                    ))}
                </div>
            )}

            {/* Namespace Dropdown */}
            {showNamespaceDropdown && (
                <div
                    ref={namespaceDropdownRef}
                    className="fixed bg-slate-900 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
                    style={{
                        minWidth: "180px",
                        maxWidth: "300px",
                        width: "auto",
                    }}
                >
                    <div className="text-xs font-semibold px-2 py-1 text-slate-400 sticky top-0 bg-slate-900 border-b border-slate-700">
                        Select Namespace
                    </div>
                    {getAvailableNamespaces().map(({ value, label }, index) => (
                        <div
                            key={`${value}-${index}`}
                            className={`px-2 py-1 text-xs cursor-pointer hover:bg-slate-700 text-left whitespace-nowrap ${
                                value === primaryConnection?.namespace ? "text-green-400" : "text-white"
                            }`}
                            onClick={() => handleNamespaceChange(value)}
                        >
                            {label}
                        </div>
                    ))}
                </div>
            )}

            {/* Debug Module Panel */}
            <DebugModulePanel
                moduleId={activeDebugModule}
                onClose={() => setActiveDebugModule(null)}
            />
        </div>
    );
};

export default MediumIndicator;
