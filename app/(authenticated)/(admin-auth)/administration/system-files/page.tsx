'use client';

import React, { useState, useCallback, useRef, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { FileSystemNode } from '@/lib/redux/fileSystem/types';
import { NodeItem } from '@/components/file-system/draggable/NodeItem';
import FileSystemManager from '@/utils/file-operations/FileSystemManager';
import {
  Upload,
  FolderPlus,
  Copy,
  Trash2,
  File,
  Folder,
  ExternalLink,
  Loader2,
  ChevronRight,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const BUCKET_NAME = 'app-assets';

// Predefined folder categories
const FOLDER_CATEGORIES = [
  { value: 'voice-samples', label: 'Voice Samples', description: 'Audio files used as voice examples' },
  { value: 'documentation', label: 'Documentation', description: 'Markdown and text documentation files' },
  { value: 'sample-files', label: 'Sample Files', description: 'Sample presentations, CSVs, and other files' },
  { value: 'images', label: 'Images', description: 'Globally stored images and graphics' },
  { value: 'templates', label: 'Templates', description: 'File templates for various purposes' },
  { value: 'exports', label: 'Exports', description: 'Exported data and reports' },
  { value: 'other', label: 'Other', description: 'Miscellaneous files' },
] as const;

interface FileNodeItemProps {
  node: FileSystemNode;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

function FileNodeItem({ node, depth, isExpanded, onToggle, isSelected, onSelect }: FileNodeItemProps) {
  const isFolder = node.contentType === 'FOLDER';

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent transition-colors',
          isSelected && 'bg-accent',
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={onSelect}
      >
        {isFolder && (
          <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="p-0.5 hover:bg-muted rounded">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        )}
        {!isFolder && <div className="w-4" />}
        {isFolder ? <Folder className="h-4 w-4 text-blue-500" /> : <File className="h-4 w-4 text-gray-500" />}
        <span className="text-sm flex-1 truncate">{node.name}</span>
        {!isFolder && node.metadata?.size && (
          <span className="text-xs text-muted-foreground">{formatBytes(node.metadata.size)}</span>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function SystemFilesPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const slice = createFileSystemSlice(BUCKET_NAME);
  const selectors = createFileSystemSelectors(BUCKET_NAME);
  const { actions } = slice;

  const allNodes = useAppSelector(selectors.selectAllNodes);
  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const activeNode = useAppSelector(selectors.selectActiveNode);
  const isLoading = useAppSelector(selectors.selectIsLoading);
  const isInitialized = useAppSelector(selectors.selectIsInitialized);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [customFolderName, setCustomFolderName] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  // Create stable set of selected node IDs
  const selectedNodeIds = React.useMemo(() => {
    return new Set(selectedNodes.map(n => n.itemId));
  }, [selectedNodes]);

  // Load initial data
  React.useEffect(() => {
    if (!isInitialized) {
      startTransition(() => {
        dispatch(actions.listContents({ forceFetch: true }));
      });
    }
  }, [isInitialized, dispatch, actions]);

  const rootNodes = allNodes.filter(node => node.parentId === 'root' || node.storagePath.split('/').length === 1);

  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleSelectNode = useCallback((node: FileSystemNode) => {
    dispatch(actions.selectNode({ nodeId: node.itemId, isMultiSelect: false, isRangeSelect: false }));
  }, [dispatch, actions]);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      dispatch(actions.listContents({ forceFetch: true }));
      toast({
        title: 'Refreshing files',
        description: 'Loading latest file structure...',
      });
    });
  }, [dispatch, actions, toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select files to upload',
        variant: 'destructive',
      });
      return;
    }

    const folderPath = selectedFolder === 'custom' ? customFolderName : selectedFolder;
    if (!folderPath) {
      toast({
        title: 'No folder selected',
        description: 'Please select or create a folder',
        variant: 'destructive',
      });
      return;
    }

    setUploadProgress(true);
    const fileManager = FileSystemManager.getInstance();
    const successCount = { count: 0 };
    const failCount = { count: 0 };

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const filePath = `${folderPath}/${file.name}`;

        try {
          await fileManager.uploadFile(BUCKET_NAME, filePath, file);
          successCount.count++;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          failCount.count++;
        }
      }

      // Refresh the file list
      dispatch(actions.listContents({ forceFetch: true }));

      toast({
        title: 'Upload complete',
        description: `Successfully uploaded ${successCount.count} file(s)${failCount.count > 0 ? `, ${failCount.count} failed` : ''}`,
        variant: successCount.count > 0 ? 'default' : 'destructive',
      });

      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      setSelectedFolder('');
      setCustomFolderName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'An error occurred during upload',
        variant: 'destructive',
      });
    } finally {
      setUploadProgress(false);
    }
  }, [selectedFiles, selectedFolder, customFolderName, dispatch, actions, toast]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast({
        title: 'Invalid folder name',
        description: 'Please enter a folder name',
        variant: 'destructive',
      });
      return;
    }

    try {
      await dispatch(actions.createFolder({ name: newFolderName.trim() }));
      
      toast({
        title: 'Folder created',
        description: `Successfully created folder: ${newFolderName}`,
      });

      setIsCreateFolderDialogOpen(false);
      setNewFolderName('');
      dispatch(actions.listContents({ forceFetch: true }));
    } catch (error) {
      console.error('Create folder error:', error);
      toast({
        title: 'Failed to create folder',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  }, [newFolderName, dispatch, actions, toast]);

  const handleCopyUrl = useCallback(async (node: FileSystemNode) => {
    if (node.contentType === 'FOLDER') return;

    try {
      const fileManager = FileSystemManager.getInstance();
      const result = await fileManager.getFileUrl(BUCKET_NAME, node.storagePath, { expiresIn: 31536000 }); // 1 year
      
      await navigator.clipboard.writeText(result.url);
      
      toast({
        title: 'URL copied',
        description: 'File URL has been copied to clipboard',
      });
    } catch (error) {
      console.error('Copy URL error:', error);
      toast({
        title: 'Failed to copy URL',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleDelete = useCallback(async (node: FileSystemNode) => {
    try {
      await dispatch(actions.deleteActiveNode());
      
      toast({
        title: 'Deleted',
        description: `Successfully deleted: ${node.name}`,
      });

      dispatch(actions.listContents({ forceFetch: true }));
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Failed to delete',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  }, [dispatch, actions, toast]);

  const renderTreeNodes = useCallback((nodes: FileSystemNode[], depth = 0): React.ReactNode[] => {
    return nodes.map(node => {
      const isExpanded = expandedNodes.has(node.itemId);
      const isSelected = selectedNodeIds.has(node.itemId);
      const children = allNodes.filter(n => n.parentId === node.itemId);

      return (
        <div key={node.itemId}>
          <FileNodeItem
            node={node}
            depth={depth}
            isExpanded={isExpanded}
            onToggle={() => handleToggleNode(node.itemId)}
            isSelected={isSelected}
            onSelect={() => handleSelectNode(node)}
          />
          {isExpanded && children.length > 0 && (
            <div>{renderTreeNodes(children, depth + 1)}</div>
          )}
        </div>
      );
    });
  }, [allNodes, expandedNodes, selectedNodeIds, handleToggleNode, handleSelectNode]);

  return (
    <div className="h-[calc(100vh-2.5rem)] flex flex-col overflow-hidden">
      <div className="flex-1 flex gap-4 p-4 min-h-0">
        {/* File Tree */}
        <Card className="w-96 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">App Assets</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isPending}
              >
                <RefreshCw className={cn('h-4 w-4', (isLoading || isPending) && 'animate-spin')} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Public files for app-wide use
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-2 pb-2">
              {isLoading && !isInitialized ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : rootNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
                  <Folder className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No files yet</p>
                  <p className="text-xs">Upload files to get started</p>
                </div>
              ) : (
                <div className="py-2">{renderTreeNodes(rootNodes)}</div>
              )}
            </ScrollArea>
          </CardContent>
          <Separator />
          <div className="p-3 flex gap-2">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Files</DialogTitle>
                  <DialogDescription>
                    Upload files to the app-assets bucket for use throughout the application
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder-select">Destination Folder</Label>
                    <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                      <SelectTrigger id="folder-select">
                        <SelectValue placeholder="Select a folder" />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLDER_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex flex-col">
                              <span>{cat.label}</span>
                              <span className="text-xs text-muted-foreground">{cat.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Custom folder...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedFolder === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-folder">Custom Folder Name</Label>
                      <Input
                        id="custom-folder"
                        placeholder="Enter folder name"
                        value={customFolderName}
                        onChange={(e) => setCustomFolderName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="file-input">Select Files</Label>
                    <Input
                      id="file-input"
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      disabled={uploadProgress}
                    />
                    {selectedFiles && selectedFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {selectedFiles.length} file(s) selected
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={uploadProgress}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpload} disabled={uploadProgress || !selectedFiles}>
                    {uploadProgress ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Folder</DialogTitle>
                  <DialogDescription>
                    Create a new folder in the app-assets bucket
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="folder-name">Folder Name</Label>
                    <Input
                      id="folder-name"
                      placeholder="e.g., voice-samples"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          handleCreateFolder();
                        }
                      }}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateFolderDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* File Details Panel */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="border-b">
            <CardTitle>File Details</CardTitle>
            {activeNode && (
              <p className="text-xs text-muted-foreground">
                {activeNode.contentType === 'FOLDER' ? 'Folder' : 'File'}: {activeNode.name}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {activeNode ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  {activeNode.contentType === 'FOLDER' ? (
                    <Folder className="h-12 w-12 text-blue-500" />
                  ) : (
                    <File className="h-12 w-12 text-gray-500" />
                  )}
                  <div className="flex-1 space-y-1">
                    <h3 className="text-lg font-semibold">{activeNode.name}</h3>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {activeNode.storagePath}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Properties</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Type</Label>
                      <p className="font-medium">
                        {activeNode.contentType === 'FOLDER' ? 'Folder' : activeNode.extension || 'File'}
                      </p>
                    </div>
                    {activeNode.metadata?.size && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Size</Label>
                        <p className="font-medium">{formatBytes(activeNode.metadata.size)}</p>
                      </div>
                    )}
                    {activeNode.metadata?.mimetype && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">MIME Type</Label>
                        <p className="font-medium font-mono text-xs">{activeNode.metadata.mimetype}</p>
                      </div>
                    )}
                    {activeNode.metadata?.lastModified && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">Last Modified</Label>
                        <p className="font-medium">
                          {new Date(activeNode.metadata.lastModified).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {activeNode.contentType === 'FILE' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCopyUrl(activeNode)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              const fileManager = FileSystemManager.getInstance();
                              const result = await fileManager.getFileUrl(BUCKET_NAME, activeNode.storagePath);
                              window.open(result.url, '_blank');
                            } catch (error) {
                              console.error('Open file error:', error);
                              toast({
                                title: 'Failed to open file',
                                description: error instanceof Error ? error.message : 'An error occurred',
                                variant: 'destructive',
                              });
                            }
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(activeNode)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {activeNode.contentType === 'FOLDER' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Folder Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(activeNode)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Folder
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Note: Deleting a folder will delete all files within it
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <File className="h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No File Selected</h3>
                <p className="text-sm">Select a file or folder from the tree to view details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

