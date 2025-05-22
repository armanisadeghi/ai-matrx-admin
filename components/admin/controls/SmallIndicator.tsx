// components/admin/SmallIndicator.tsx
import React from "react";
import { TbBrandSocketIo } from "react-icons/tb";
import { Server, ChevronRight, Shield, ShieldOff, AlertCircle } from "lucide-react";
import StateViewerButton from "@/components/admin/state-analyzer/components/StateViewerButton";
import { useAppSelector } from "@/lib/redux";
import { selectPrimaryConnection, selectConnectionHealth } from "@/lib/redux/socket-io/selectors/socket-connection-selectors";

interface SmallIndicatorProps {
    onDragStart: (e: React.MouseEvent) => void;
    onSizeChange: () => void;
}

const SmallIndicator: React.FC<SmallIndicatorProps> = ({ onDragStart, onSizeChange }) => {
    // Redux selectors
    const primaryConnection = useAppSelector(selectPrimaryConnection);
    const primaryHealth = useAppSelector((state) => selectConnectionHealth(state, primaryConnection?.connectionId || "primary"));

    // Derived values for accurate connection status
    const isConnected = primaryConnection?.connectionStatus === "connected";
    const isAuthenticated = primaryConnection?.isAuthenticated || false;
    const hasError = !!primaryHealth.error;
    const isReconnecting = primaryHealth.isReconnecting;

    // Server detection
    const currentServer = primaryConnection?.url || "Not connected";
    const isLocalhost = currentServer.includes("localhost") || currentServer.includes("127.0.0.1") || currentServer.includes("::1");
    const isRemote = !isLocalhost && currentServer !== "Not connected";

    // Determine the actual connection state
    const isReallyConnected = isConnected && isAuthenticated && !hasError;

    // Handle mousedown without starting a drag on button elements
    const handleElementMouseDown = (e: React.MouseEvent) => {
        // Don't start drag if clicking a button
        let target = e.target as HTMLElement;
        let currentElement = target;

        // Check if we clicked on or within a button
        while (currentElement) {
            if (currentElement.tagName === "BUTTON") {
                return; // Do nothing if button was clicked
            }
            currentElement = currentElement.parentElement;
        }

        // Otherwise, initiate drag
        onDragStart(e);
    };

    // Determine server indicator color
    const getServerIndicatorColor = () => {
        if (!isConnected || hasError) return "bg-red-500";
        if (isReconnecting) return "bg-yellow-500 animate-pulse";
        if (isLocalhost) return "bg-green-400";
        if (isRemote) return "bg-blue-400";
        return "bg-gray-500";
    };

    // Determine socket indicator color
    const getSocketIndicatorColor = () => {
        if (!isConnected) return "bg-red-500";
        if (isReconnecting) return "bg-yellow-500 animate-pulse";
        if (isReallyConnected) return "bg-green-500";
        if (isConnected && !isAuthenticated) return "bg-orange-500";
        return "bg-gray-500";
    };

    return (
        <div
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 text-white shadow-lg cursor-move"
            onMouseDown={handleElementMouseDown}
            title={`${isReallyConnected ? "Connected" : "Disconnected"} - ${currentServer}`}
        >
            {/* Socket.IO Connection Status */}
            <div className="flex items-center gap-1" title={`Socket: ${isConnected ? "Connected" : "Disconnected"}`}>
                <div className={`w-2 h-2 rounded-full ${getSocketIndicatorColor()}`} />
                <TbBrandSocketIo size={14} />
            </div>

            {/* Server Status */}
            <div className="flex items-center gap-1" title={`Server: ${currentServer}`}>
                <div className={`w-2 h-2 rounded-full ${getServerIndicatorColor()}`} />
                <Server size={14} />
            </div>

            {/* Authentication Status - only show if connected but not authenticated */}
            {isConnected && !isAuthenticated && (
                <div title="Not authenticated">
                    <ShieldOff size={14} className="text-orange-400" />
                </div>
            )}

            {/* Error Indicator */}
            {hasError && (
                <div title={primaryHealth.error || "Connection error"}>
                    <AlertCircle size={14} className="text-red-400" />
                </div>
            )}

            <StateViewerButton />

            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent event from bubbling up
                    onSizeChange();
                }}
                className="p-1 rounded hover:bg-slate-700"
            >
                <ChevronRight size={14} />
            </button>
        </div>
    );
};

export default SmallIndicator;
