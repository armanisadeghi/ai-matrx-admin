'use client';

import React from 'react';
import { BaseNode } from '@/features/workflows/types';
import { getRegisteredFunctions } from '@/features/workflows/constants';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TabComponentProps {
  node: BaseNode;
  onNodeUpdate: (updatedNode: BaseNode) => void;
}

const OverviewTab: React.FC<TabComponentProps> = ({ node, onNodeUpdate }) => {
  const functionData = getRegisteredFunctions().find(f => f.id === node.function_id);

  const updateNode = (updates: Partial<BaseNode>) => {
    onNodeUpdate({ ...node, ...updates });
  };

  // Get arguments with their mappings and overrides
  const getArgumentsWithData = () => {
    if (!functionData) return [];
    
    return functionData.args.map(arg => {
      const mapping = node.arg_mapping?.find(m => m.target_arg_name === arg.name);
      const override = node.arg_overrides?.find(o => o.name === arg.name);
      
      return {
        ...arg,
        mapping,
        override
      };
    });
  };

  // Get all return brokers (default + overrides)
  const getAllReturnBrokers = () => {
    const brokers = [];
    const defaultBrokerId = functionData?.return_broker;
    
    // Add override return brokers first
    if (node.return_broker_overrides) {
      node.return_broker_overrides.forEach(broker => {
        brokers.push({ 
          id: broker, 
          type: broker === defaultBrokerId ? 'default' : 'override' 
        });
      });
    }
    
    // Add default return broker only if it's not already in the overrides
    if (defaultBrokerId && !node.return_broker_overrides?.includes(defaultBrokerId)) {
      brokers.push({ id: defaultBrokerId, type: 'default' });
    }
    
    return brokers;
  };

  const argumentsWithData = getArgumentsWithData();
  const allReturnBrokers = getAllReturnBrokers();

  return (
    <div className="space-y-4 p-4">
      {/* Basic Info Section */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Left column - editable fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="step-name" className="text-xs font-medium text-muted-foreground">Step Name</Label>
                  <Input
                    id="step-name"
                    value={node.step_name || ''}
                    onChange={(e) => updateNode({ step_name: e.target.value })}
                    placeholder="Enter step name"
                    className={`h-8 text-sm placeholder:text-muted-foreground/60 ${
                      (node.step_name || '') === 'Unnamed Step' 
                        ? 'text-muted-foreground dark:text-muted-foreground' 
                        : ''
                    }`}
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="function-type" className="text-xs font-medium text-muted-foreground">Function Type</Label>
                  <Select
                    value={node.function_type || 'registered_function'}
                    onValueChange={(value) => updateNode({ function_type: value })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select function type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="registered_function">Registered Function</SelectItem>
                      <SelectItem value="custom_function">Custom Function</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="execution-required"
                    checked={node.execution_required || false}
                    onCheckedChange={(checked) => updateNode({ execution_required: !!checked })}
                  />
                  <Label htmlFor="execution-required" className="text-xs font-medium">Execution Required</Label>
                </div>
                
                <Badge variant={node.status === 'ready_to_execute' ? 'default' : 'secondary'} className="text-xs">
                  {node.status || 'pending'}
                </Badge>
              </div>
            </div>

            {/* Right column - read-only info */}
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium">Node ID:</span>
                <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all text-xs">{node.id}</div>
              </div>
              <div>
                <span className="text-muted-foreground font-medium">Workflow ID:</span>
                <div className="font-mono bg-muted px-2 py-1 rounded mt-1 break-all text-xs">
                  {node.workflow_id || <span className="text-muted-foreground italic">Not assigned</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Function Information */}
      {functionData && (
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
      )}

      {/* Arguments & Mappings */}
      {argumentsWithData.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Arguments & Mappings</h3>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-8">Name</TableHead>
                  <TableHead className="h-8">Type</TableHead>
                  <TableHead className="h-8">Required</TableHead>
                  <TableHead className="h-8">Default Value</TableHead>
                  <TableHead className="h-8">Ready</TableHead>
                  <TableHead className="h-8">Mapped Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {argumentsWithData.map((arg, index) => (
                  <TableRow key={index} className="text-xs">
                    <TableCell className="py-2 font-medium">{arg.name}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs">{arg.data_type}</Badge>
                    </TableCell>
                    <TableCell className="py-2">
                      {arg.required ? (
                        <Badge variant="destructive" className="text-xs">Required</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {arg.override?.default_value !== undefined ? (
                        <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                          {JSON.stringify(arg.override.default_value)}
                        </span>
                      ) : arg.default_value !== null ? (
                        <span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                          {JSON.stringify(arg.default_value)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {(arg.override?.ready ?? arg.ready) ? (
                        <Badge variant="default" className="text-xs">Ready</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not Ready</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      {arg.mapping ? (
                        <span className="font-mono bg-blue-50 dark:bg-blue-950 px-1 py-0.5 rounded text-xs">
                          {arg.mapping.source_broker_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dependencies */}
      {node.additional_dependencies && node.additional_dependencies.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-3">Dependencies</h3>
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-8">Source Broker</TableHead>
                  <TableHead className="h-8">Target Broker</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {node.additional_dependencies.map((dep, index) => (
                  <TableRow key={index} className="text-xs">
                    <TableCell className="py-2 font-mono">{dep.source_broker_id}</TableCell>
                    <TableCell className="py-2 font-mono">
                      {dep.target_broker_id || <span className="text-muted-foreground">None</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OverviewTab;
