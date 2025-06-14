'use client';

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRegisteredFunctions } from "@/features/workflows/react-flow/node-editor/workflow-node-editor/utils/arg-utils";
import { DbFunctionNode } from '@/features/workflows/types';
import { getAllReturnBrokers } from '@/features/workflows/react-flow/node-editor/workflow-node-editor/utils';
import { EnrichedBroker } from '@/features/workflows/utils/data-flow-manager';

interface FunctionInfoSectionProps {
  nodeData: DbFunctionNode;
  onNodeUpdate: (nodeData: DbFunctionNode) => void;
  enrichedBrokers: EnrichedBroker[];
}

/**
 * FunctionInfoSection - Displays function details and return brokers
 */
const FunctionInfoSection: React.FC<FunctionInfoSectionProps> = ({ nodeData, enrichedBrokers }) => {
  const functionData = getRegisteredFunctions().find(f => f.id === nodeData.function_id);
  const allReturnBrokers = getAllReturnBrokers(nodeData, functionData);

  // Don't render if no function data
  if (!functionData) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Function: {functionData.name}</h3>
            <Badge variant="outline" className="text-xs">{functionData.id}</Badge>
          </div>
          
          {/* Return Brokers */}
          {allReturnBrokers.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground font-medium">Return Brokers:</span>
              <div className="space-y-1 mt-1">
                {allReturnBrokers.map((broker, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-xs">{broker.id}</span>
                    <Badge variant={broker.type === 'default' ? 'secondary' : 'outline'} className="text-xs">
                      {broker.type === 'default' ? 'Default' : 'Additional Override'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FunctionInfoSection; 