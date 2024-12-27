"use client";

import { useFileSystem } from "@/lib/redux/fileSystem/Provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Folder, File } from "lucide-react";
import { FileSystemNode } from "@/lib/redux/fileSystem/types";

const FileSystemTest = () => {
  const {
    availableBuckets,
    activeBucket,
    setActiveBucket,
    getHooksForBucket,
    isLoading,
  } = useFileSystem();

  const hooks = getHooksForBucket(activeBucket);
  const { 
    useTreeTraversal, 
    useSelection, 
    useTreeStructure 
  } = hooks;
  
  // Tree navigation and structure
  const { 
    activeNode,
    activeNodeChildren,
    navigateToNode,
    navigateToRoot,
    canNavigateUp,
    canNavigateInto
  } = useTreeTraversal();

  // Selection management
  const {
    selectedNodes,
    selectNode,
    isSelected,
    clearSelection,
    isMultiSelectMode
  } = useSelection();

  // Tree structure and refresh
  const {
    rootNodes,
    refreshTree,
    loadNodeChildren
  } = useTreeStructure();

  // Handle node click with selection support
  const handleNodeClick = (node: FileSystemNode, event: React.MouseEvent) => {
    // Handle selection
    selectNode(node.itemId, event);
    
    // Handle navigation for folders
    if (node.contentType === "FOLDER") {
      navigateToNode(node.itemId);
      loadNodeChildren(node.itemId);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Tabs
        value={activeBucket}
        onValueChange={(value: any) => setActiveBucket(value)}
        className="mb-4"
      >
        <TabsList>
          {availableBuckets.map((bucket) => (
            <TabsTrigger key={bucket} value={bucket}>
              {bucket}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-2 mb-4">
            <Button
              onClick={() => refreshTree(true)}
              disabled={isLoading}
            >
              Refresh Tree
            </Button>
            
            {canNavigateUp && (
              <Button
                onClick={() => navigateToRoot()}
                disabled={isLoading}
              >
                Go to Root
              </Button>
            )}

            {isMultiSelectMode && (
              <Button
                onClick={() => clearSelection()}
                disabled={isLoading}
              >
                Clear Selection
              </Button>
            )}
          </div>

          <div className="border rounded-lg p-2">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-1">
                {/* Show root nodes when no active node */}
                {!activeNode ? (
                  rootNodes.map((node) => (
                    <NodeItem 
                      key={node.itemId}
                      node={node}
                      isSelected={isSelected(node.itemId)}
                      onClick={handleNodeClick}
                    />
                  ))
                ) : (
                  // Show active node's children
                  activeNodeChildren.map((node) => (
                    <NodeItem 
                      key={node.itemId}
                      node={node}
                      isSelected={isSelected(node.itemId)}
                      onClick={handleNodeClick}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Node display component
const NodeItem = ({ 
  node, 
  isSelected, 
  onClick 
}: { 
  node: FileSystemNode; 
  isSelected: boolean;
  onClick: (node: FileSystemNode, event: React.MouseEvent) => void;
}) => {
  return (
    <div
      className={`p-2 rounded cursor-pointer ${
        isSelected ? "bg-accent" : "hover:bg-accent/50"
      }`}
      onClick={(e) => onClick(node, e)}
    >
      <div className="flex items-center space-x-2">
        {node.contentType === "FOLDER" ? (
          <Folder className="h-4 w-4" />
        ) : (
          <File className="h-4 w-4" />
        )}
        <span>{node.name}</span>
        {node.metadata && (
          <span className="text-sm text-muted-foreground">
            ({node.metadata.size} bytes)
          </span>
        )}
      </div>
    </div>
  );
};

export default FileSystemTest;