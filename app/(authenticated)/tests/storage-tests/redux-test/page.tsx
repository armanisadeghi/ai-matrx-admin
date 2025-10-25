'use client';

import { useEffect, useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, FileUp, FolderTree, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileSystemProvider, useFileSystem } from '@/lib/redux/fileSystem/Provider';

function FileSystemTest() {
  const {
    availableBuckets,
    activeBucket,
    isInitialized,
    isLoading,
    error,
    setActiveBucket,
    getHooksForBucket
  } = useFileSystem();

  const [currentPath, setCurrentPath] = useState("");

  // Get hooks for active bucket
  const hooks = getHooksForBucket(activeBucket);
  const {
    useTreeTraversal,
    useFileOperations,
    useSelection,
    useOperationLock,
    useTreeStructure
  } = hooks;

  const navigation = useTreeTraversal();
  const { currentOperation } = useOperationLock();
  const { selectedNodeIds, selectNode } = useSelection();
  const operations = useFileOperations();
  const { rootNodes: tree } = useTreeStructure();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Upload files using the file operations hook
      // TODO: Implement batch upload functionality
      console.log('Upload files:', files);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>File System Test Interface</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Tabs 
              value={activeBucket} 
              onValueChange={(value) => {
                setActiveBucket(value as typeof availableBuckets[number]);
                setCurrentPath("");
              }}
            >
              <TabsList>
                {availableBuckets.map(bucket => (
                  <TabsTrigger key={bucket} value={bucket}>
                    {bucket}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            {/* Debug Controls */}
            <div className="flex space-x-2">
              <Button 
                onClick={() => navigation.navigateToRoot()}
                variant="outline"
              >
                Navigate to Root
              </Button>
              <Button 
                onClick={() => {
                  if (navigation.activeNode?.parentId) {
                    navigation.navigateToParent();
                  }
                }}
                variant="outline"
                disabled={!navigation.canNavigateUp}
              >
                Navigate Up
              </Button>
            </div>

            {/* Debug Info */}
            <div className="text-sm space-y-1">
              <div>Active Bucket: {activeBucket}</div>
              <div>Active Node: {navigation.activeNode?.name || "Root"}</div>
              <div>Is Initialized: {isInitialized ? "Yes" : "No"}</div>
              <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
              <div>Children Count: {navigation.activeNodeChildren?.length || 0}</div>
              <div>Has Error: {error ? "Yes" : "No"}</div>
              {error && <div className="text-red-500">Error: {error}</div>}
            </div>
          </div>
        </CardContent>
      </Card>

      {currentOperation && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Current Operation</AlertTitle>
          <AlertDescription>
            Type: {currentOperation.type}
            <br />
            Status: {currentOperation.status.isLoading ? 'Loading' : 'Complete'}
            {currentOperation.status.error && (
              <div className="text-red-500">
                Error: {currentOperation.status.error}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Navigation and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Navigation and Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Navigation Actions */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => navigation.navigateToRoot()}
              variant="outline"
              size="icon"
              title="Go to Root"
            >
              <FolderTree className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => navigation.navigateToParent()}
              variant="outline"
              size="icon"
              disabled={!navigation.canNavigateUp}
              title="Go Up"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              asChild
            >
              <label>
                <FileUp className="h-4 w-4" />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleUpload}
                />
              </label>
            </Button>
          </div>

          {/* Current Location */}
          <div className="text-sm text-muted-foreground">
            Location: {navigation.activeNode?.storagePath || '/'}
          </div>
        </CardContent>
      </Card>

      {/* Content Display */}
      <div className="grid grid-cols-2 gap-4">
        {/* Folder Contents */}
        <Card>
          <CardHeader>
            <CardTitle>Contents</CardTitle>
          </CardHeader>
          <CardContent className="h-96 overflow-auto">
            {isLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-2">
                {navigation.activeNodeChildren.map(node => (
                  <div
                    key={node.itemId}
                    className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedNodeIds.includes(node.itemId) ? 'bg-blue-100' : ''
                    }`}
                    onClick={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        selectNode(node.itemId, e);
                      } else if (node.contentType === 'FOLDER') {
                        navigation.navigateToNode(node.itemId);
                      } else {
                        selectNode(node.itemId, e);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>{node.name}</span>
                      <span className="text-sm text-gray-500">
                        {node.contentType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {node.itemId}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* State Debug View */}
        <Card>
          <CardHeader>
            <CardTitle>Current State</CardTitle>
          </CardHeader>
          <CardContent className="h-96 overflow-auto">
            <pre className="text-xs">
              {JSON.stringify({
                activeBucket,
                isInitialized,
                isLoading,
                error,
                currentOperation,
                navigation: {
                  activeNode: navigation.activeNode?.name,
                  childrenCount: navigation.activeNodeChildren?.length,
                  canNavigateUp: navigation.canNavigateUp,
                  canNavigateInto: navigation.canNavigateInto
                },
                selection: {
                  count: selectedNodeIds.length,
                  nodeIds: selectedNodeIds
                }
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FileSystemTestPage() {
    const allowedBuckets = ["userContent", "Audio", "Images", "Documents", "Code", "any-file"] as const;
    
    return (
      <FileSystemProvider 
        initialBucket="Images"
        allowedBuckets={allowedBuckets}
      >
        <FileSystemTest />
      </FileSystemProvider>
    );
  }