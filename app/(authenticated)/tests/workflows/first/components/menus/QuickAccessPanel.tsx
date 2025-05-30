"use client";
import { Button } from "@/components/ui/button";
import { 
  Database, Globe, ArrowRightLeft, GitBranch, Mail, FileText, Key,
  Sparkles, Code, User 
} from "lucide-react";

interface QuickAccessPanelProps {
  onAddNode: (type: string) => void;
}

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onAddNode }) => {
  return (
    <div className="flex flex-col gap-2">
      {/* Core Workflow Nodes - NEW! */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">CORE WORKFLOW</div>
        <div className="flex gap-2">
          <Button 
            onClick={() => onAddNode("recipe")} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
          >
            <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Recipe
          </Button>
          <Button 
            onClick={() => onAddNode("genericFunction")} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          >
            <Code className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            Function
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Button 
            onClick={() => onAddNode("userInput")} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
          >
            <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            User Input
          </Button>
        </div>
      </div>
      
      {/* Integration Nodes */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold">INTEGRATIONS</div>
      <div className="flex gap-2">
        <Button 
          onClick={() => onAddNode("database")} 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Database className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          Database
        </Button>
        <Button 
          onClick={() => onAddNode("api")} 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          API
        </Button>
      </div>
      <div className="flex gap-2">
        <Button 
          onClick={() => onAddNode("transform")} 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <ArrowRightLeft className="h-4 w-4 text-green-600 dark:text-green-400" />
          Transform
        </Button>
        <Button
          onClick={() => onAddNode("conditional")}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <GitBranch className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          Condition
        </Button>
      </div>
      {/* Email and File Operation buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={() => onAddNode("email")} 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          Email
        </Button>
        <Button
          onClick={() => onAddNode("fileOperation")}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
          File
        </Button>
      </div>
      {/* Authentication and Webhook buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => onAddNode("authentication")}
          variant="outline"
          size="sm"
          className="flex items-center gap-1"
        >
          <Key className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          Auth
        </Button>
        <Button 
          onClick={() => onAddNode("webhook")} 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
        >
          <Globe className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          Webhook
        </Button>
      </div>
    </div>
  );
};

export default QuickAccessPanel; 