'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug } from "lucide-react";
import { Node, Edge } from "reactflow";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import { UserInputNode, BrokerRelayNode, FunctionNode, DbNodeData, ConvertedWorkflowData } from "@/features/workflows/types";

interface DebugOverlayProps {
  nodes: Node[];
  edges: Edge[];
  coreWorkflowData?: any;
  viewport?: any;
  userInputs: UserInputNode[];
  relays: BrokerRelayNode[];
  functionNodes: FunctionNode[];
  editingNode: DbNodeData | null;
  workflowDataForReactFlow: ConvertedWorkflowData | null;
  className?: string;
}

const DebugOverlay: React.FC<DebugOverlayProps> = ({ 
  nodes, 
  edges, 
  coreWorkflowData,
  viewport,
  userInputs,
  relays,
  functionNodes,
  editingNode,
  workflowDataForReactFlow,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const StateTab = ({ label, data }: { label: string; data: any }) => (
    <Card>
      <CardContent>
        <RawJsonExplorer pageData={data} />
      </CardContent>
    </Card>
  );

  const SimpleStatsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Basic Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">nodes (ReactFlow)</span>
              <Badge variant="secondary">{nodes.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">edges (ReactFlow)</span>
              <Badge variant="secondary">{edges.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">userInputs</span>
              <Badge variant="secondary">{userInputs.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">relays</span>
              <Badge variant="secondary">{relays.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">functionNodes</span>
              <Badge variant="secondary">{functionNodes.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">editingNode</span>
              <Badge variant="secondary">{editingNode ? "1" : "null"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

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
      
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Raw Workflow State Debug Panel
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs defaultValue="nodes" className="w-full h-full flex flex-col">
            <TabsList className="text-xs">
              <TabsTrigger value="nodes">nodes</TabsTrigger>
              <TabsTrigger value="edges">edges</TabsTrigger>
              <TabsTrigger value="userInputs">userInputs</TabsTrigger>
              <TabsTrigger value="relays">relays</TabsTrigger>
              <TabsTrigger value="functionNodes">functionNodes</TabsTrigger>
              <TabsTrigger value="editingNode">editingNode</TabsTrigger>
              <TabsTrigger value="coreWorkflowData">coreWorkflowData</TabsTrigger>
              <TabsTrigger value="workflowDataForReactFlow">workflowDataForReactFlow</TabsTrigger>
              <TabsTrigger value="viewport">viewport</TabsTrigger>
              <TabsTrigger value="stats">stats</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <TabsContent value="nodes" className="mt-4">
                <StateTab label="nodes (useNodesState)" data={nodes} />
              </TabsContent>

              <TabsContent value="edges" className="mt-4">
                <StateTab label="edges (useEdgesState)" data={edges} />
              </TabsContent>

              <TabsContent value="userInputs" className="mt-4">
                <StateTab label="userInputs (useState)" data={userInputs} />
              </TabsContent>

              <TabsContent value="relays" className="mt-4">
                <StateTab label="relays (useState)" data={relays} />
              </TabsContent>

              <TabsContent value="functionNodes" className="mt-4">
                <StateTab label="functionNodes (useState)" data={functionNodes} />
              </TabsContent>

              <TabsContent value="editingNode" className="mt-4">
                <StateTab label="editingNode (useState)" data={editingNode} />
              </TabsContent>

              <TabsContent value="coreWorkflowData" className="mt-4">
                <StateTab label="coreWorkflowData (useState)" data={coreWorkflowData} />
              </TabsContent>

              <TabsContent value="workflowDataForReactFlow" className="mt-4">
                <StateTab label="workflowDataForReactFlow (useState)" data={workflowDataForReactFlow} />
              </TabsContent>

              <TabsContent value="viewport" className="mt-4">
                <StateTab label="viewport (getViewport())" data={viewport} />
              </TabsContent>

              <TabsContent value="stats" className="mt-4">
                <SimpleStatsTab />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebugOverlay; 