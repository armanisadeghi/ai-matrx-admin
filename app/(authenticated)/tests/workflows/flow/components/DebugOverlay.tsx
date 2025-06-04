'use client';

import React, { useState } from 'react';
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
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
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