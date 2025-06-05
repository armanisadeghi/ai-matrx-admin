'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Copy, Download, Eye } from "lucide-react";
import { Node, Edge } from "reactflow";

export interface WorkflowRelay {
  source: string;
  targets: string[];
}

export interface UserInput {
  broker_id: string;
  value: any;
}

export interface WorkflowDefinition {
  nodes: any[];
  relays?: WorkflowRelay[];
  user_inputs?: UserInput[];
}

interface DebugOverlayProps {
  nodes: Node[];
  edges: Edge[];
  className?: string;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ nodes, edges, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Analyze broker connections for debugging
  const brokerAnalysis = useMemo(() => {
    const userInputs = nodes.filter(node => node.data?.type === 'userInput');
    const workflowNodes = nodes.filter(node => !node.data?.type || (node.data?.type !== 'userInput' && node.data?.type !== 'brokerRelay'));
    const relays = nodes.filter(node => node.data?.type === 'brokerRelay');
    
    const connections = [];
    
    // Analyze connections from user inputs
    userInputs.forEach(userInput => {
      const brokerId = userInput.data?.broker_id;
      if (!brokerId) return;
      
      // Check for argument mappings
      workflowNodes.forEach(workflowNode => {
        const argMappings = workflowNode.data?.arg_mapping || [];
        argMappings.forEach(mapping => {
          if (mapping.source_broker_id === brokerId) {
            connections.push({
              type: 'argument_mapping',
              source: userInput.id,
              sourceLabel: userInput.data?.label || `User Input`,
              sourceBrokerId: brokerId,
              target: workflowNode.id,
              targetLabel: workflowNode.data?.step_name || 'Workflow Node',
              targetArgName: mapping.target_arg_name,
              connection: `${brokerId} → ${mapping.target_arg_name}`
            });
          }
        });
        
        // Check for dependencies
        const dependencies = workflowNode.data?.additional_dependencies || [];
        dependencies.forEach(dependency => {
          if (dependency.source_broker_id === brokerId) {
            connections.push({
              type: 'dependency',
              source: userInput.id,
              sourceLabel: userInput.data?.label || 'User Input',
              sourceBrokerId: brokerId,
              target: workflowNode.id,
              targetLabel: workflowNode.data?.step_name || 'Workflow Node',
              targetBrokerId: dependency.target_broker_id,
              connection: `${brokerId} → ${dependency.target_broker_id || 'execution dependency'}`
            });
          }
        });
      });
      
      // Check for relay connections
      relays.forEach(relay => {
        if (relay.data?.source === brokerId) {
          connections.push({
            type: 'relay',
            source: userInput.id,
            sourceLabel: userInput.data?.label || 'User Input',
            sourceBrokerId: brokerId,
            target: relay.id,
            targetLabel: relay.data?.label || 'Broker Relay',
            targetBrokerIds: relay.data?.targets || [],
            connection: `${brokerId} → [${(relay.data?.targets || []).join(', ')}]`
          });
        }
      });
    });
    
    return {
      userInputs: userInputs.length,
      workflowNodes: workflowNodes.length,
      relays: relays.length,
      connections: connections,
      virtualEdges: edges.filter(edge => edge.id?.startsWith('virtual_')).length,
      regularEdges: edges.filter(edge => !edge.id?.startsWith('virtual_')).length
    };
  }, [nodes, edges]);

  // Generate the backend-expected workflow structure
  const getWorkflowDefinition = (): WorkflowDefinition => {
    const workflowNodes = nodes.map(node => node.data);
    
    // Extract relays from broker relay nodes
    const relays: WorkflowRelay[] = nodes
      .filter(node => node.data.type === 'brokerRelay')
      .map(node => ({
        source: node.data.source,
        targets: node.data.targets || []
      }));

    // Extract user inputs from user input nodes
    const user_inputs: UserInput[] = nodes
      .filter(node => node.data.type === 'userInput')
      .map(node => ({
        broker_id: node.data.broker_id,
        value: node.data.value
      }));

    return {
      nodes: workflowNodes,
      relays: relays.length > 0 ? relays : undefined,
      user_inputs: user_inputs.length > 0 ? user_inputs : undefined
    };
  };

  const workflowDefinition = getWorkflowDefinition();

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getNodeTypeStats = () => {
    const stats: { [key: string]: number } = {};
    nodes.forEach(node => {
      const type = node.data.type || node.type || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  };

  const nodeStats = getNodeTypeStats();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 ${className}`}
        >
          <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Debug
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Workflow Debug Information
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue="workflow" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="brokers">Brokers</TabsTrigger>
              <TabsTrigger value="nodes">Nodes</TabsTrigger>
              <TabsTrigger value="edges">Edges</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Workflow Definition Tab */}
              <TabsContent value="workflow" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Backend Workflow Definition</CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(workflowDefinition)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadJson(workflowDefinition, 'workflow-definition.json')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono h-full min-h-[400px]">
                      {JSON.stringify(workflowDefinition, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Broker Connections Tab */}
              <TabsContent value="brokers" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Broker Analysis Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Broker Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">User Inputs</span>
                          <Badge variant="secondary">{brokerAnalysis.userInputs}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Workflow Nodes</span>
                          <Badge variant="secondary">{brokerAnalysis.workflowNodes}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Broker Relays</span>
                          <Badge variant="secondary">{brokerAnalysis.relays}</Badge>
                        </div>
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Broker Connections</span>
                            <Badge variant="default">{brokerAnalysis.connections.length}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Virtual Edges</span>
                            <Badge variant="outline">{brokerAnalysis.virtualEdges}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Regular Edges</span>
                            <Badge variant="outline">{brokerAnalysis.regularEdges}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Connection Types */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Connection Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {['argument_mapping', 'dependency', 'relay'].map(type => {
                          const count = brokerAnalysis.connections.filter(conn => conn.type === type).length;
                          return (
                            <div key={type} className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground capitalize">
                                {type.replace('_', ' ')}
                              </span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Connections */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Detailed Broker Connections</CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(brokerAnalysis.connections)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadJson(brokerAnalysis.connections, 'broker-connections.json')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {brokerAnalysis.connections.length > 0 ? (
                      <div className="space-y-3">
                        {brokerAnalysis.connections.map((connection, index) => (
                          <div key={index} className="border rounded-lg p-3 bg-muted/30">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={
                                connection.type === 'argument_mapping' ? 'default' :
                                connection.type === 'dependency' ? 'destructive' : 'secondary'
                              }>
                                {connection.type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs font-mono text-muted-foreground">
                                {connection.connection}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium">{connection.sourceLabel}</span>
                              <span className="text-muted-foreground"> → </span>
                              <span className="font-medium">{connection.targetLabel}</span>
                            </div>
                            {connection.targetArgName && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Argument: {connection.targetArgName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No broker connections found. Add user inputs and connect them to workflow nodes to see connections here.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Nodes Tab */}
              <TabsContent value="nodes" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">React Flow Nodes ({nodes.length})</CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(nodes)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadJson(nodes, 'nodes.json')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono h-full min-h-[400px]">
                      {JSON.stringify(nodes, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Edges Tab */}
              <TabsContent value="edges" className="mt-4 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">React Flow Edges ({edges.length})</CardTitle>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(edges)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadJson(edges, 'edges.json')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono h-full min-h-[400px]">
                      {JSON.stringify(edges, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Node Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Nodes</span>
                          <Badge variant="secondary">{nodes.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Edges</span>
                          <Badge variant="secondary">{edges.length}</Badge>
                        </div>
                        <div className="border-t pt-3">
                          <p className="text-sm font-medium mb-2">Node Types</p>
                          <div className="space-y-2">
                            {Object.entries(nodeStats).map(([type, count]) => (
                              <div key={type} className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                                <Badge variant="outline">{count}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Workflow Components</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Workflow Nodes</span>
                          <Badge variant="secondary">{workflowDefinition.nodes.length}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Broker Relays</span>
                          <Badge variant="secondary">{workflowDefinition.relays?.length || 0}</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">User Inputs</span>
                          <Badge variant="secondary">{workflowDefinition.user_inputs?.length || 0}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebugOverlay; 