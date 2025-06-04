'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { ArgumentOverride, registeredFunctions } from '../constants';
import { SocketExecuteButton } from "@/components/socket-io/presets/SocketExecuteButton";
import { 
  Play, 
  Database, 
  Video, 
  FileText, 
  Workflow, 
  Brain, 
  Code, 
  Settings,
  Zap,
  Globe,
  Trash2,
  Edit
} from "lucide-react";

interface WorkflowNodeProps {
  data: any;
  selected: boolean;
  onDelete?: (nodeId: string) => void;
  onEdit?: (nodeData: any) => void;
}

// Function to get icon based on function name
const getFunctionIcon = (funcName: string) => {
  const name = funcName.toLowerCase();
  
  if (name.includes('recipe') || name.includes('run')) return Play;
  if (name.includes('database') || name.includes('schema')) return Database;
  if (name.includes('video') || name.includes('youtube')) return Video;
  if (name.includes('pdf') || name.includes('document')) return FileText;
  if (name.includes('workflow') || name.includes('orchestrator')) return Workflow;
  if (name.includes('ai') || name.includes('brain')) return Brain;
  if (name.includes('code') || name.includes('function')) return Code;
  if (name.includes('web') || name.includes('url')) return Globe;
  if (name.includes('process') || name.includes('execute')) return Zap;
  
  // Default icon
  return Settings;
};

// Function to get status badge color
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending': return 'secondary';
    case 'initialized': return 'outline';
    case 'ready_to_execute': return 'default';
    case 'executing': return 'default';
    case 'execution_complete': return 'default';
    case 'execution_failed': return 'destructive';
    default: return 'secondary';
  }
};

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected, onDelete, onEdit }) => {
  const functionData = registeredFunctions.find(f => f.id === data.function_id);
  const hasRequiredInputs = functionData?.args.some(arg => {
    const override = data.arg_overrides?.find((o: ArgumentOverride) => o.name === arg.name);
    return arg.required && !(override?.ready ?? arg.ready);
  });
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Default status if not provided
  const status = data.status || 'pending';
  
  const IconComponent = getFunctionIcon(functionData?.func_name || '');
    
  useEffect(() => {
    setMounted(true);
    
    // Add dark mode class to container if in dark mode
    const container = document.body;
    if (mode === 'dark') {
      container.classList.add('react-flow-dark-mode');
    } else {
      container.classList.remove('react-flow-dark-mode');
    }
    
    return () => {
      container.classList.remove('react-flow-dark-mode');
    };
  }, [mode]);

  const nodeContent = (
    <Card className={`
      min-w-44 max-w-52 transition-all duration-200 cursor-pointer
      ${selected 
        ? 'ring-2 ring-primary shadow-lg' 
        : 'hover:shadow-md'
      }
      ${data.execution_required ? 'bg-destructive/5 border-destructive/20' : ''}
    `}>
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Step name takes full top row - made smaller */}
          <div className="w-full">
            <h3 className="font-medium text-[11px] text-foreground truncate text-center">
              {data.step_name || 'Unnamed Step'}
            </h3>
          </div>
          
          {/* Icon and function name in second row */}
          <div className="flex items-center gap-2">
            <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground truncate">
                {functionData?.func_name || 'Unknown Function'}
              </p>
            </div>
          </div>
          
          {/* Status and other badges */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Status badge */}
            <Badge variant={getStatusBadgeVariant(status)} className="text-[9px] px-1 py-0 h-4">
              {status.replace(/_/g, ' ')}
            </Badge>
            
            {data.execution_required && (
              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                Required
              </Badge>
            )}
            {hasRequiredInputs && (
              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Input
              </Badge>
            )}
            {data.arg_mapping?.length > 0 && (
              <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Connected
              </Badge>
            )}
            {data.additional_dependencies?.length > 0 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                Deps
              </Badge>
            )}
          </div>
          
          {/* Execute button */}
          <div className="w-full">
            <SocketExecuteButton
              presetName="execute_workflow_node"
              sourceData={data}
              buttonText="Test"
              size="sm"
              variant="outline"
              className="w-full h-6 text-[10px]"
              overlayTitle={`Test Node: ${data.step_name || 'Unnamed Step'}`}
              overlayDescription="Execute this workflow node individually for testing"
            />
          </div>
        </div>
        
        {/* Connection points */}
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm"></div>
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
      </CardContent>
    </Card>
  );

  // Only wrap in ContextMenu if we have delete/edit handlers
  if (onDelete || onEdit) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {nodeContent}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(data)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Node
            </ContextMenuItem>
          )}
          {onDelete && (
            <ContextMenuItem 
              onClick={() => onDelete(data.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Node
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return nodeContent;
};

export default WorkflowNode; 