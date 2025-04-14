// components/admin/LargeIndicator.tsx
import React from "react";
import { ChevronRight, X } from "lucide-react";
import MatrxDynamicPanel from "@/components/matrx/resizable/MatrxDynamicPanel";
import EnhancedEntityAnalyzer from "@/components/admin/redux/EnhancedEntityAnalyzer";

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
  isConnected: boolean;
  currentServer: string;
  onSizeDown: () => void;
  onSizeSmall: () => void;
}

const LargeIndicator: React.FC<LargeIndicatorProps> = ({
  user,
  isConnected,
  currentServer,
  onSizeDown,
  onSizeSmall,
}) => {
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
            </div>
          </div>
          <div className="bg-slate-700 p-3 rounded">
            <div className="text-xs text-slate-400">Socket Status</div>
            <div className={`text-lg font-semibold ${isConnected ? "text-green-400" : "text-red-400"}`}>
              {isConnected ? "Online" : "Offline"}
            </div>
          </div>
          <div className="bg-slate-700 p-3 rounded col-span-2">
            <div className="text-xs text-slate-400">Server URL</div>
            <div
              className={`text-sm font-semibold ${currentServer?.includes("localhost") ? "text-yellow-400" : "text-blue-400"}`}
              title={currentServer}
            >
              {currentServer}
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