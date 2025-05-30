"use client";
import { Database, Globe, ArrowRightLeft, GitBranch, Repeat, Clock, Mail, FileText, Key } from "lucide-react";
import { NodeData } from "./WorkflowEditor";

interface NodeMenuProps {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onAddNode: (type: string) => void;
}

const NodeMenu: React.FC<NodeMenuProps> = ({ 
  open, 
  position, 
  onClose, 
  onAddNode 
}) => {
  if (!open) return null;

  return (
    <div
      className="absolute z-10 bg-white dark:bg-gray-800 shadow-md rounded-md border border-gray-200 dark:border-gray-700 p-2"
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 px-2">Add Node</div>
      <div className="space-y-1">
        <button
          onClick={() => onAddNode("trigger")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <div className="w-4 h-4 text-red-500">🔴</div>
          Trigger
        </button>
        <button
          onClick={() => onAddNode("agent")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <div className="w-4 h-4 text-gray-500">🤖</div>
          Agent
        </button>
        <button
          onClick={() => onAddNode("database")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Database className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Database
        </button>
        <button
          onClick={() => onAddNode("api")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          API
        </button>
        <button
          onClick={() => onAddNode("transform")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4 text-green-600 dark:text-green-400" />
          Transform
        </button>
        <button
          onClick={() => onAddNode("conditional")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <GitBranch className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Condition
        </button>
        <button
          onClick={() => onAddNode("loop")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Repeat className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          Loop
        </button>
        <button
          onClick={() => onAddNode("delay")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Delay
        </button>

        {/* Additional node options */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>

        <button
          onClick={() => onAddNode("email")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Email
        </button>
        <button
          onClick={() => onAddNode("calendarEvent")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Calendar Event
        </button>
        <button
          onClick={() => onAddNode("personalTask")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Personal Task
        </button>
        <button
          onClick={() => onAddNode("fileOperation")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
          File Operation
        </button>
        <button
          onClick={() => onAddNode("authentication")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Authentication
        </button>
        <button
          onClick={() => onAddNode("webhook")}
          className="w-full text-left text-sm px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
        >
          <Globe className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
          Webhook
        </button>
      </div>
    </div>
  );
};

export default NodeMenu; 