"use client";
import { Button } from "@/components/ui/button";
import { Save, Play, Settings, ChevronRight, Home, Package } from "lucide-react";
import WorkflowDebugOverlay from "./WorkflowDebugOverlay";

interface WorkflowHeaderProps {
  title: string;
  getWorkflowData: () => {
    nodes: any[];
    edges: any[];
    selectedNode: any;
  };
  status?: "draft" | "published" | "running" | "error";
  lastUpdated?: string;
  workflowPath?: string[];
  showBrokers?: boolean;
  onToggleBrokers?: () => void;
  onSave?: () => void;
  onRun?: () => void;
  onSettings?: () => void;
  onNavigate?: (path: string) => void;
}

const WorkflowHeader: React.FC<WorkflowHeaderProps> = ({
  title,
  getWorkflowData,
  status = "draft",
  lastUpdated,
  workflowPath = [],
  showBrokers = false,
  onToggleBrokers,
  onSave,
  onRun,
  onSettings,
  onNavigate
}) => {
  // Status indicator colors
  const statusColors = {
    draft: { bg: "bg-amber-100 dark:bg-amber-900", text: "text-amber-800 dark:text-amber-200", label: "Draft" },
    published: { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-800 dark:text-blue-200", label: "Published" },
    running: { bg: "bg-green-100 dark:bg-green-900", text: "text-green-800 dark:text-green-200", label: "Running" },
    error: { bg: "bg-red-100 dark:bg-red-900", text: "text-red-800 dark:text-red-200", label: "Error" }
  };

  const currentStatus = statusColors[status];

  return (
    <header className="border-b bg-textured px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        {/* Left side: Title and breadcrumbs */}
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100">{title}</h1>
          
          {workflowPath.length > 0 && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span className="mx-2">•</span>
              <button 
                onClick={() => onNavigate && onNavigate('/')}
                className="hover:text-gray-900 dark:hover:text-gray-200 flex items-center"
              >
                <Home className="h-3.5 w-3.5 mr-1" />
                Home
              </button>
              
              {workflowPath.map((path, index) => (
                <div key={index} className="flex items-center">
                  <ChevronRight className="h-3 w-3 mx-1" />
                  <button 
                    onClick={() => onNavigate && onNavigate(path)}
                    className="hover:text-gray-900 dark:hover:text-gray-200"
                  >
                    {path}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right side: Status and action buttons */}
        <div className="flex items-center space-x-3">
          {lastUpdated && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated}
            </span>
          )}
          
          <div className={`px-2 py-0.5 rounded-full ${currentStatus.bg} ${currentStatus.text} text-xs font-medium`}>
            {currentStatus.label}
          </div>
          
          <div className="flex items-center space-x-2 ml-3">
            <WorkflowDebugOverlay getWorkflowData={getWorkflowData} />
            
            {onToggleBrokers && (
              <Button 
                variant="outline" 
                size="sm" 
                className={`flex items-center gap-1 ${
                  showBrokers 
                    ? 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
                    : 'text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                }`}
                onClick={onToggleBrokers}
              >
                <Package className="h-4 w-4" />
                Brokers
              </Button>
            )}
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              onClick={onSettings}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 text-green-600 dark:text-green-400 border-green-300 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950"
              onClick={onRun}
            >
              <Play className="h-4 w-4" />
              Run
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              onClick={onSave}
            >
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default WorkflowHeader; 