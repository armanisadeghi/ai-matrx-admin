'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useTheme } from "@/styles/themes/ThemeProvider";
import { ArrowRightLeft, Edit, Trash2, Copy, Plus } from "lucide-react";

export interface BrokerRelayData {
  id: string;
  type: 'brokerRelay';
  source: string;
  targets: string[];
  label?: string;
}

interface BrokerRelayNodeProps {
  data: BrokerRelayData;
  selected: boolean;
  onDelete?: (nodeId: string) => void;
  onEdit?: (nodeData: any) => void;
}

const BrokerRelayNode: React.FC<BrokerRelayNodeProps> = ({ data, selected, onDelete, onEdit }) => {
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

  const nodeContent = (
    <Card className={`
      min-w-48 max-w-56 transition-all duration-200 cursor-pointer
      ${selected 
        ? 'ring-2 ring-blue-500 shadow-lg' 
        : 'hover:shadow-md'
      }
      bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800
    `}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-xs text-blue-900 dark:text-blue-100 truncate">
                {data.label || 'Broker Relay'}
              </h3>
              <p className="text-[10px] text-blue-700 dark:text-blue-300 truncate">
                Data router
              </p>
            </div>
          </div>
          
          {/* Source broker display */}
          <div className="bg-blue-100 dark:bg-blue-900/50 rounded px-2 py-1">
            <p className="text-[9px] text-blue-800 dark:text-blue-200 font-mono truncate">
              From: {data.source || 'Not set'}
            </p>
          </div>

          {/* Target brokers display */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-blue-300 dark:border-blue-700">
                {data.targets?.length || 0} target{(data.targets?.length || 0) !== 1 ? 's' : ''}
              </Badge>
            </div>
            {data.targets && data.targets.length > 0 && (
              <div className="space-y-0.5 max-h-16 overflow-y-auto">
                {data.targets.slice(0, 3).map((target, index) => (
                  <div key={index} className="text-[9px] text-blue-700 dark:text-blue-300 truncate bg-white dark:bg-blue-950/50 rounded px-1 py-0.5">
                    → {target}
                  </div>
                ))}
                {data.targets.length > 3 && (
                  <div className="text-[9px] text-blue-600 dark:text-blue-400 px-1">
                    +{data.targets.length - 3} more...
                  </div>
                )}
              </div>
            )}
            {(!data.targets || data.targets.length === 0) && (
              <div className="text-[9px] text-blue-600 dark:text-blue-400 px-1 py-0.5">
                No targets set
              </div>
            )}
          </div>
        </div>
        
        {/* Connection points - input and output */}
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-background shadow-sm"></div>
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full border-2 border-background shadow-sm"></div>
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
              Edit Relay
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(data.source)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Source ID
          </ContextMenuItem>
          <ContextMenuItem onClick={() => navigator.clipboard.writeText(JSON.stringify(data.targets))}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Target IDs
          </ContextMenuItem>
          {onDelete && (
            <ContextMenuItem 
              onClick={() => onDelete(data.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Relay
            </ContextMenuItem>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return nodeContent;
};

export default BrokerRelayNode; 