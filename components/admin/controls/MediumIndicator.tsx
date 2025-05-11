// components/admin/MediumIndicator.tsx
import React, { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, Move, User, Server, Wifi, WifiOff, Shield, ShieldOff, RefreshCw } from "lucide-react";
import { PiPathFill } from "react-icons/pi";
import { usePathname } from "next/navigation";
import { getAvailableNamespaces } from "@/constants/socket-schema";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { getChatActionsWithThunks } from "@/lib/redux/entity/custom-actions/chatActions";
import { createChatSelectors } from "@/lib/redux/entity/custom-selectors/chatSelectors";

interface User {
  id: string;
  email?: string;
  name?: string;
}

interface MediumIndicatorProps {
  user: User;
  isConnected: boolean;
  isAuthenticated?: boolean;
  currentServer: string | null;
  currentNamespace?: string | null;
  onDragStart: (e: React.MouseEvent) => void;
  onSizeUp: () => void;
  onSizeDown: () => void;
  getAvailableServers: () => Promise<string[]>;
  connectToServer: (server: string) => Promise<void>;
  overrideNamespace: (namespace: string) => Promise<void>;
  clearServerOverride: () => void;
}

// Status Indicator Component
interface StatusIndicatorProps {
  isActive: boolean;
  icon: {
    active: React.ReactNode;
    inactive: React.ReactNode;
  };
  tooltip: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ isActive, icon, tooltip }) => (
  <div 
    className={`flex items-center justify-center w-6 h-6 rounded ${isActive ? "text-green-500" : "text-red-500"}`}
    title={tooltip}
  >
    {isActive ? icon.active : icon.inactive}
  </div>
);

const MediumIndicator: React.FC<MediumIndicatorProps> = ({
  user,
  isConnected,
  isAuthenticated = false,
  currentServer,
  currentNamespace = "/UserSession",
  onDragStart,
  onSizeUp,
  onSizeDown,
  getAvailableServers,
  connectToServer,
  overrideNamespace,
  clearServerOverride,
}) => {
  const currentPath = usePathname();
  const [availableServers, setAvailableServers] = useState<string[]>([]);
  const [showServerDropdown, setShowServerDropdown] = useState(false);
  const [showNamespaceDropdown, setShowNamespaceDropdown] = useState(false);
  const serverButtonRef = useRef<HTMLDivElement>(null);
  const serverDropdownRef = useRef<HTMLDivElement>(null);
  const namespaceButtonRef = useRef<HTMLDivElement>(null);
  const namespaceDropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const chatActions = getChatActionsWithThunks();
  const chatSelectors = createChatSelectors();
  const isDebugMode = useAppSelector(chatSelectors.isDebugMode);

  const handleToggleDebugMode = () => {
    dispatch(chatActions.setChatDebugMode({ isDebugMode: !isDebugMode }));
  }

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Only trigger drag if clicking on the container itself, not its children
    if (e.currentTarget === e.target) {
      onDragStart(e);
    }
  };

  // Fetch available servers
  useEffect(() => {
    const fetchServers = async () => {
      try {
        const servers = await getAvailableServers();
        if (Array.isArray(servers)) {
          const normalizedServers = [...new Set(servers.map(server => server.trim().toLowerCase()))];
          setAvailableServers(normalizedServers);
        }
      } catch (error) {
        console.error("Failed to fetch servers:", error);
      }
    };
    
    fetchServers();
  }, [getAvailableServers]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close server dropdown if clicked outside
      if (
        showServerDropdown &&
        serverDropdownRef.current &&
        serverButtonRef.current &&
        !serverDropdownRef.current.contains(event.target as Node) &&
        !serverButtonRef.current.contains(event.target as Node)
      ) {
        setShowServerDropdown(false);
      }

      // Close namespace dropdown if clicked outside
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

  // Position dropdowns correctly and adjust width based on content
  useEffect(() => {
    if (showServerDropdown && serverButtonRef.current && serverDropdownRef.current) {
      const buttonRect = serverButtonRef.current.getBoundingClientRect();
      
      // Position the dropdown
      serverDropdownRef.current.style.left = `${buttonRect.left}px`;
      serverDropdownRef.current.style.top = `${buttonRect.bottom + 5}px`;
      
      // Let it render with auto width first
      setTimeout(() => {
        if (serverDropdownRef.current) {
          // Get the width needed for the content (add padding)
          const contentWidth = serverDropdownRef.current.scrollWidth + 10;
          
          // Get available space on screen
          const availableWidth = window.innerWidth - buttonRect.left - 20;
          
          // Set width to content width, but cap it at available space
          const finalWidth = Math.min(contentWidth, availableWidth);
          serverDropdownRef.current.style.width = `${finalWidth}px`;
        }
      }, 0);
    }

    if (showNamespaceDropdown && namespaceButtonRef.current && namespaceDropdownRef.current) {
      const buttonRect = namespaceButtonRef.current.getBoundingClientRect();
      
      // Position the dropdown
      namespaceDropdownRef.current.style.left = `${buttonRect.left}px`;
      namespaceDropdownRef.current.style.top = `${buttonRect.bottom + 5}px`;
      
      // Let it render with auto width first
      setTimeout(() => {
        if (namespaceDropdownRef.current) {
          // Get the width needed for the content (add padding)
          const contentWidth = namespaceDropdownRef.current.scrollWidth + 10;
          
          // Get available space on screen
          const availableWidth = window.innerWidth - buttonRect.left - 20;
          
          // Set width to content width, but cap it at available space
          const finalWidth = Math.min(contentWidth, availableWidth);
          namespaceDropdownRef.current.style.width = `${finalWidth}px`;
        }
      }, 0);
    }
  }, [showServerDropdown, showNamespaceDropdown]);

  // Handle server change
  const handleServerChange = (value: string) => {
    connectToServer(value);
    setShowServerDropdown(false);
  };

  // Handle namespace change
  const handleNamespaceChange = (value: string) => {
    overrideNamespace(value);
    setShowNamespaceDropdown(false);
  };

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
          />
          <StatusIndicator
            isActive={isAuthenticated}
            icon={{
              active: <Shield size={14} />,
              inactive: <ShieldOff size={14} />,
            }}
            tooltip={isAuthenticated ? "Authenticated" : "Not Authenticated"}
          />
          <button
            onClick={handleToggleDebugMode}
            className={`ml-2 px-2 py-0.5 text-xs rounded ${
              isDebugMode ? "bg-green-600 text-white" : "bg-slate-600 text-slate-300"
            }`}
            title="Toggle Debug Mode"
          >
            {isDebugMode ? "Debug: ON" : "Debug: OFF"}
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => clearServerOverride()}
            className="p-1 rounded hover:bg-slate-700"
            title="Reset to Default"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-2 py-1 text-xs space-y-1">
        {/* User Info */}
        <div className="flex items-center justify-between gap-2">
          <User size={16} />
          <span className="text-blue-400 truncate flex-1 text-right">{user.email || user.name || user.id}</span>
        </div>

        {/* Server Selection - clickable to show dropdown */}
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
                currentServer === "Not connected" || currentServer === "Connection error"
                  ? "text-red-400"
                  : currentServer?.includes("localhost")
                  ? "text-green-400"
                  : "text-blue-400"
              }
              title={currentServer || ""}
            >
              {currentServer}
            </span>
          </div>
        </div>

        {/* Namespace Selection - clickable to show dropdown */}
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
            <span className="text-blue-400 truncate text-right" title={currentNamespace || ""}>
              {currentNamespace}
            </span>
          </div>
        </div>

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

      {/* Portaled Dropdowns */}
      {showServerDropdown && (
        <div 
          ref={serverDropdownRef}
          className="fixed bg-slate-900 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
          style={{ 
            minWidth: '180px',
            maxWidth: '300px',
            width: 'auto'
          }}
        >
          <div className="text-xs font-semibold px-2 py-1 text-slate-400 sticky top-0 bg-slate-900 border-b border-slate-700">
            Select Server
          </div>
          {availableServers.length > 0 ? (
            availableServers.map((server, index) => (
              <div 
                key={`${server}-${index}`}
                className={`px-2 py-1 text-xs cursor-pointer hover:bg-slate-700 text-right whitespace-nowrap ${
                  server === currentServer ? "text-green-400" : "text-white"
                }`}
                onClick={() => handleServerChange(server)}
              >
                {server}
              </div>
            ))
          ) : (
            <div className="px-2 py-1 text-xs text-slate-400 text-right">No servers available</div>
          )}
        </div>
      )}

      {showNamespaceDropdown && (
        <div 
          ref={namespaceDropdownRef}
          className="fixed bg-slate-900 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto"
          style={{ 
            minWidth: '180px',
            maxWidth: '300px',
            width: 'auto'
          }}
        >
          <div className="text-xs font-semibold px-2 py-1 text-slate-400 sticky top-0 bg-slate-900 border-b border-slate-700">
            Select Namespace
          </div>
          {getAvailableNamespaces().map(({ value, label }, index) => (
            <div 
              key={`${value}-${index}`}
              className={`px-2 py-1 text-xs cursor-pointer hover:bg-slate-700 text-right whitespace-nowrap ${
                value === currentNamespace ? "text-green-400" : "text-white"
              }`}
              onClick={() => handleNamespaceChange(value)}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediumIndicator;