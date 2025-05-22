// components/admin/LargeIndicator.tsx
import React from "react";
import { ChevronRight, X, Server, Wifi, WifiOff, Shield, ShieldOff, AlertCircle } from "lucide-react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";
import { useAppSelector } from "@/lib/redux";
import {
    selectPrimaryConnection,
    selectIsAdmin,
    selectAllConnectionsHealth,
} from "@/lib/redux/socket-io/selectors/socket-connection-selectors";

interface User {
    id: string;
    email?: string;
    name?: string;
    userMetadata?: {
        fullName: string;
    };
    [key: string]: any;
}

interface LargeIndicatorProps {
    user: User;
    onSizeDown: () => void;
    onSizeSmall: () => void;
}

const LargeIndicator: React.FC<LargeIndicatorProps> = ({ user, onSizeDown, onSizeSmall }) => {
    // Redux selectors - minimal set for display
    const primaryConnection = useAppSelector(selectPrimaryConnection);
    const isAdmin = useAppSelector(selectIsAdmin);
    const allConnectionsHealth = useAppSelector(selectAllConnectionsHealth);

    // Derived values
    const isConnected = primaryConnection?.connectionStatus === "connected";
    const isAuthenticated = primaryConnection?.isAuthenticated || false;
    const currentServer = primaryConnection?.url || "Not connected";
    const currentNamespace = primaryConnection?.namespace || "/UserSession";
    const activeConnectionsCount = allConnectionsHealth.filter((c) => c.isHealthy).length;
    const totalConnectionsCount = allConnectionsHealth.length;

    // Check if there are any connection errors
    const hasConnectionError = allConnectionsHealth.some((c) => c.error);
    const primaryConnectionError = allConnectionsHealth.find((c) => c.connectionId === primaryConnection?.connectionId)?.error;

    // The main content for the large panel
    const LargeControls = () => (
        <div className="bg-slate-800 text-white">
            <div className="flex justify-between items-center px-4 py-3 bg-slate-900">
                <div className="font-semibold">Admin Dashboard</div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSizeDown();
                        }}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <ChevronRight size={16} className="rotate-180" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onSizeSmall();
                        }}
                        className="p-1 rounded hover:bg-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
            <div className="p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-700 p-3 rounded">
                        <div className="text-xs text-slate-400">Admin Name</div>
                        <div className="text-sm font-semibold text-blue-400 truncate" title={user.id}>
                            {user.userMetadata?.fullName || user.name || user.email || user.id}
                            {isAdmin && <span className="text-green-400 text-xs ml-1">(Admin)</span>}
                        </div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded">
                        <div className="text-xs text-slate-400">Socket Status</div>
                        <div className="flex items-center gap-2">
                            <div className={`text-lg font-semibold ${isConnected ? "text-green-400" : "text-red-400"}`}>
                                {isConnected ? "Online" : "Offline"}
                            </div>
                            <div className="flex items-center gap-1">
                                {isConnected ? (
                                    <Wifi size={14} className="text-green-400" />
                                ) : (
                                    <WifiOff size={14} className="text-red-400" />
                                )}
                                {isAuthenticated ? (
                                    <Shield size={14} className="text-green-400" />
                                ) : (
                                    <ShieldOff size={14} className="text-red-400" />
                                )}{" "}
                                {hasConnectionError && (
                                    <span title="Connection errors detected">
                                        <AlertCircle size={14} className="text-yellow-400" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded col-span-2">
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                            <Server size={12} />
                            Server URL
                        </div>
                        <div
                            className={`text-sm font-semibold ${
                                !isConnected || primaryConnectionError
                                    ? "text-red-400"
                                    : currentServer?.includes("localhost")
                                    ? "text-yellow-400"
                                    : "text-blue-400"
                            }`}
                            title={currentServer}
                        >
                            {currentServer}
                        </div>
                        {primaryConnectionError && <div className="text-xs text-red-400 mt-1">Error: {primaryConnectionError}</div>}
                        <div className="text-xs text-slate-400 mt-2">
                            Namespace: <span className="text-blue-400">{currentNamespace}</span>
                        </div>
                    </div>
                    <div className="bg-slate-700 p-3 rounded col-span-2">
                        <div className="text-xs text-slate-400">Connection Health</div>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-sm">
                                Active Connections:{" "}
                                <span className={activeConnectionsCount > 0 ? "text-green-400" : "text-red-400"}>
                                    {activeConnectionsCount}
                                </span>
                                /{totalConnectionsCount}
                            </span>
                            {!isConnected && <span className="text-xs text-yellow-400">Click socket icon in admin panel to reconnect</span>}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm" onClick={(e) => e.stopPropagation()}>
                        View Logs
                    </button>
                    <button className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm" onClick={(e) => e.stopPropagation()}>
                        User Management
                    </button>
                </div>
                <EnhancedEntityAnalyzer defaultExpanded={false} selectedEntityKey="message" />
            </div>
        </div>
    );

    return (
        <MatrxDynamicPanel
            initialPosition="left"
            defaultExpanded={true}
            expandButtonProps={{
                label: "",
            }}
        >
            <LargeControls />
        </MatrxDynamicPanel>
    );
};

export default LargeIndicator;
