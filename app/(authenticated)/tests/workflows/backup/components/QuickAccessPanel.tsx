"use client";
import { Button } from "@/components/ui/button";
import { Database, Globe, ArrowRightLeft, GitBranch, Mail, FileText, Key } from "lucide-react";

interface QuickAccessPanelProps {
  onAddNode: (type: string) => void;
}

const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({ onAddNode }) => {
  return (
    <div className="flex flex-col gap-2">
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