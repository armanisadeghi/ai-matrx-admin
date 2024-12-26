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
    useFileSystemNavigation,
    useFileSystemOperations,
    useSelection,
    useOperationLock,
    useFileSystemTree
  } = hooks;

  const navigation = useFileSystemNavigation(currentPath);
  const { currentOperation } = useOperationLock();
  const { selection, handleSelection } = useSelection();
  const operations = useFileSystemOperations();
  const { tree, actions: treeActions } = useFileSystemTree();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await navigation.actions.uploadFiles(files);
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
                onClick={() => navigation.actions.refresh()}
                variant="outline"
              >
                Force Refresh Current Path
              </Button>
              <Button 
                onClick={() => {
                  setCurrentPath("");
                  navigation.actions.refresh();
                }}
                variant="outline"
              >
                Fetch Root Content
              </Button>
            </div>

            {/* Debug Info */}
            <div className="text-sm space-y-1">
              <div>Active Bucket: {activeBucket}</div>
              <div>Current Path: {currentPath || "/"}</div>
              <div>Is Initialized: {isInitialized ? "Yes" : "No"}</div>
              <div>Is Loading: {isLoading ? "Yes" : "No"}</div>
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
          {/* ... rest of the component ... */}
          <div className="flex items-center space-x-2">
            <Input
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              placeholder="Enter path"
            />
            <Button
              onClick={() => navigation.actions.navigateToPath(currentPath)}
              variant="outline"
            >
              Go
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={() => navigation.actions.refresh()}
              variant="outline"
              size="icon"
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

          {/* Breadcrumbs */}
          <div className="flex items-center space-x-2">
            {navigation.breadcrumbs?.map((crumb, index) => (
              <Button
                key={crumb.path}
                variant="ghost"
                size="sm"
                disabled={!crumb.isClickable}
                onClick={() => navigation.actions.navigateToPath(crumb.path)}
              >
                {crumb.name || 'Root'}
                {index < (navigation.breadcrumbs?.length || 0) - 1 && ' /'}
              </Button>
            ))}
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
            {navigation.isLoading ? (
              <div>Loading...</div>
            ) : (
              <div className="space-y-2">
                {navigation.children.map(node => (
                  <div
                    key={node.itemid}
                    className={`p-2 border rounded ${
                      selection.selectedNodes.has(node.itemid) ? 'bg-blue-100' : ''
                    }`}
                    onClick={(e) => handleSelection(node.itemid, e)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{node.name}</span>
                      <span className="text-sm text-gray-500">
                        {node.contentType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {node.itemid}
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
                  currentPath: navigation.currentPath,
                  children: navigation.children,
                  isLoading: navigation.isLoading,
                  isStale: navigation.isStale
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