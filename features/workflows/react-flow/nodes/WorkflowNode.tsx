'use client';

import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { getRegisteredFunctions } from '@/features/workflows/constants';
import { SocketExecuteButton } from "@/components/socket-io/presets/SocketExecuteButton";
import FullscreenSocketAccordion from "@/components/socket/response/FullscreenSocketAccordion";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
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
  Edit,
  TestTube
} from "lucide-react";
import { BaseNode, ArgumentOverride } from '@/features/workflows/types';
import { isNodeConnected } from '@/features/workflows/utils/node-utils';

interface WorkflowNodeProps {
  data: BaseNode;
  selected: boolean;
  onDelete?: (nodeId: string) => void;
  onEdit?: (nodeData: BaseNode) => void;
  userInputs?: Array<{broker_id: string; value: any}>; // Optional user inputs from the workflow
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

const WorkflowNode: React.FC<WorkflowNodeProps> = ({ data, selected, onDelete, onEdit, userInputs }) => {
  const dispatch = useAppDispatch();
  const functionData = getRegisteredFunctions().find(f => f.id === data.function_id);
  const hasRequiredInputs = functionData?.args.some(arg => {
    const override = data.arg_overrides?.find((o: ArgumentOverride) => o.name === arg.name);
    return arg.required && !(override?.ready ?? arg.ready);
  });
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // State for programmatic execution
  const [isTestOverlayOpen, setIsTestOverlayOpen] = useState(false);
  const [testTaskId, setTestTaskId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Default status if not provided
  const status = data.status || 'pending';
  
  // Check if node is guaranteed to fail (has required args that aren't ready or mapped)
  const nodeConnected = isNodeConnected(data);
  const willFail = !nodeConnected;
  
  const IconComponent = getFunctionIcon(functionData?.name || '');
    
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

  // Programmatic execution function (replicates SocketExecuteButton logic)
  const executeStepProgrammatically = async () => {
    setIsExecuting(true);
    setTestTaskId(null);

    try {
      const sourceData = {
        ...data,
        user_inputs: userInputs || []
      };

      const createdTaskId = await dispatch(createTaskFromPresetQuick({
        presetName: "workflow_step_to_execute_single_step",
        sourceData: sourceData
      })).unwrap();
      
      setTestTaskId(createdTaskId);
      setIsTestOverlayOpen(true);
      
    } catch (err) {
      // Could add error handling here if needed
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTestOverlayClose = () => {
    setIsTestOverlayOpen(false);
    setTestTaskId(null);
  };

  const nodeContent = (
    <div className="relative">
      <Card className={`
        min-w-44 max-w-52 transition-all duration-200 cursor-pointer
        ${selected 
          ? 'ring-2 ring-primary shadow-lg' 
          : 'hover:shadow-md'
        }
        ${willFail 
          ? 'border-red-500 dark:border-red-400 ring-2 ring-red-200 dark:ring-red-800 bg-red-50 dark:bg-red-950/50' 
          : data.execution_required 
          ? 'bg-destructive/5 border-destructive/20' 
          : ''
        }
      `}>
        <CardContent className="p-3">
          <div className="space-y-2">
            {/* Step name takes full top row - made smaller */}
            <div className="w-full flex items-center justify-center gap-1">
              {willFail && (
                <span className="text-red-500 dark:text-red-400 text-[10px]" title="Missing required inputs - will fail">
                  ⚠️
                </span>
              )}
              <h3 className="font-medium text-[11px] text-foreground truncate text-center">
                {data.step_name || 'Unnamed Step'}
              </h3>
            </div>
            
            {/* Icon and function name in second row */}
            <div className="flex items-center gap-2">
              <IconComponent className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground truncate">
                  {functionData?.name || 'Unknown Function'}
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
            <div className="w-full flex justify-start">
              <SocketExecuteButton
                presetName="workflow_step_to_execute_single_step"
                sourceData={{
                  ...data,
                  user_inputs: userInputs || []
                }}
                buttonText="Test Step"
                size="sm"
                variant="outline"
                className="h-6 px-1 text-[10px] [&>svg]:w-2 [&>svg]:h-2 [&>svg]:mr-0"
                overlayTitle={`Test Step: ${data.step_name || 'Unnamed Step'}`}
                overlayDescription="Execute this workflow step individually for testing"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* ReactFlow Handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          width: 12,
          height: 12,
          backgroundColor: '#3b82f6',
          border: '2px solid white',
          left: -6
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 12,
          height: 12,
          backgroundColor: '#22c55e',
          border: '2px solid white',
          right: -6
        }}
      />
    </div>
  );

  // Only wrap in ContextMenu if we have delete/edit handlers
  if (onDelete || onEdit) {
    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            {nodeContent}
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem 
              onClick={executeStepProgrammatically}
              disabled={isExecuting}
            >
              <TestTube className="h-4 w-4 mr-2" />
              {isExecuting ? "Testing..." : "Test Step (Fullscreen)"}
            </ContextMenuItem>
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

        {/* Fullscreen Test Overlay */}
        <FullscreenSocketAccordion
          isOpen={isTestOverlayOpen}
          onClose={handleTestOverlayClose}
          taskId={testTaskId}
          showTrigger={false}
        />
      </>
    );
  }

  return nodeContent;
};

export default WorkflowNode; 