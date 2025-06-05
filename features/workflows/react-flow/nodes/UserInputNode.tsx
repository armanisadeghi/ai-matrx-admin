'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { User, Edit, Trash2, Copy } from "lucide-react";

export interface UserInputData {
  id: string;
  type: 'userInput';
  broker_id: string;
  value: any;
  label?: string;
  data_type?: 'int' | 'float' | 'str' | 'bool' | 'list' | 'tuple' | 'dict' | 'set';
}

interface UserInputNodeProps {
  data: UserInputData;
  selected: boolean;
  onDelete?: (nodeId: string) => void;
  onEdit?: (nodeData: any) => void;
}

const UserInputNode: React.FC<UserInputNodeProps> = ({ data, selected, onDelete, onEdit }) => {
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  
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

  const getValueDisplay = () => {
    if (data.value === null || data.value === undefined) return 'No value';
    if (typeof data.value === 'object') return JSON.stringify(data.value);
    return String(data.value);
  };

  const nodeContent = (
    <Card className={`
      min-w-44 max-w-52 transition-all duration-200 cursor-pointer
      ${selected 
        ? 'ring-2 ring-emerald-500 shadow-lg' 
        : 'hover:shadow-md'
      }
      bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800
    `}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-xs text-emerald-900 dark:text-emerald-100 truncate">
                {data.label || 'User Input'}
              </h3>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 truncate">
                Input field
              </p>
            </div>
          </div>
          
          {/* Broker ID display */}
          <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded px-2 py-1">
            <p className="text-[9px] text-emerald-800 dark:text-emerald-200 font-mono truncate">
              ID: {data.broker_id || 'Not set'}
            </p>
          </div>

          {/* Value preview */}
          <div className="space-y-1">
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-emerald-300 dark:border-emerald-700">
              {data.data_type || 'str'}
            </Badge>
            <div className="text-[9px] text-emerald-700 dark:text-emerald-300 truncate bg-white dark:bg-emerald-950/50 rounded px-1 py-0.5">
              {getValueDisplay()}
            </div>
          </div>
        </div>
        
        {/* Connection point - output only */}
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background shadow-sm"></div>
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
              Edit Input
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(data.broker_id)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Broker ID
          </ContextMenuItem>
          {onDelete && (
            <ContextMenuItem 
              onClick={() => onDelete(data.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Input
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return nodeContent;
};

export default UserInputNode; 