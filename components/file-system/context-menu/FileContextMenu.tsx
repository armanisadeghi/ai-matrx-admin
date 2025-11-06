// FileContextMenu.tsx
"use client";
import React, { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { useFilePreview } from '@/components/file-system/preview';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import FileSystemManager from '@/utils/file-operations/FileSystemManager';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/loaders/Spinner";
import { FileOperationModals } from './FileOperationModals';
import {
  File,
  Folder,
  Edit,
  Trash2,
  Copy,
  Share2,
  Download,
  Eye,
  FileInput,
  MoreVertical,
  ExternalLink,
  Link,
  Info,
} from 'lucide-react';
import { ModalType } from './types';
import { useToast } from '@/components/ui';

interface FileContextMenuProps {
  children: React.ReactNode;
  node: FileSystemNode;
  selectedNodes?: FileSystemNode[];
  asDropdown?: boolean;
  onViewFile?: (node: FileSystemNode) => void;
  bucketName?: AvailableBuckets; // Allow explicit bucket override for multi-bucket scenarios
}

export function FileContextMenu({
  children,
  node,
  selectedNodes = [],
  asDropdown = false,
  onViewFile,
  bucketName: explicitBucket,
}: FileContextMenuProps) {
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const { openPreview } = useFilePreview();
  // Use explicit bucket if provided, otherwise fall back to activeBucket
  const bucketName = explicitBucket || activeBucket;
  const slice = createFileSystemSlice(bucketName);
  const selectors = createFileSystemSelectors(bucketName);
  const { actions } = slice;
  const { toast } = useToast();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
  const [showFileInfoModal, setShowFileInfoModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Get the nodes to operate on (selected nodes if multiple, or just the clicked node)
  const operatingNodes = selectedNodes.length > 1 ? selectedNodes : [node];
  const isMultiSelect = operatingNodes.length > 1;

  // Handle rename
  const handleRenameConfirm = useCallback(async () => {
    if (isMultiSelect || !renameValue.trim()) return;
    
    try {
      setIsLoading(true);
      
      const extension = node.extension;
      // Add extension back if user didn't include it
      let finalName = renameValue.trim();
      const newExtension = finalName.includes('.') ? finalName.split('.').pop() : '';
      if (extension && !newExtension) {
        finalName = `${finalName}.${extension}`;
      }
      
      // Select the node first
      dispatch(actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false
      }));
      
      // Dispatch rename action
      await dispatch(actions.renameActiveNode({ newName: finalName })).unwrap();
      
      // Refresh folder contents
      await dispatch(actions.listContents({ forceFetch: true })).unwrap();
      
      toast({
        title: "Success",
        description: "File renamed successfully"
      });
      
      setShowRenameModal(false);
      setRenameValue('');
    } catch (error) {
      console.error('Rename failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to rename file",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, actions, node, isMultiSelect, toast, renameValue]);

  const openRenameModal = useCallback(() => {
    const currentName = node.name;
    const extension = node.extension;
    
    // Get name without extension for editing
    const nameWithoutExt = extension && currentName.endsWith(`.${extension}`)
      ? currentName.substring(0, currentName.length - extension.length - 1)
      : currentName;
    
    setRenameValue(nameWithoutExt);
    setShowRenameModal(true);
  }, [node]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Clear selection first to ensure clean state
      dispatch(actions.clearSelection());
      
      // Select the nodes we want to delete (first without multi-select, rest with multi-select)
      operatingNodes.forEach((n, index) => {
        dispatch(actions.selectNode({
          nodeId: n.itemId,
          isMultiSelect: index > 0, // First node: false, rest: true
          isRangeSelect: false
        }));
      });

      // Use deleteFiles for batch deletion (works for single or multiple files)
      await dispatch(actions.deleteFiles(undefined)).unwrap();
      
      // Refresh folder contents
      await dispatch(actions.listContents({ forceFetch: true })).unwrap();
      
      toast({
        title: "Success",
        description: `Deleted ${operatingNodes.length} ${operatingNodes.length > 1 ? 'items' : 'item'}`,
      });
      
      setActiveModal(null);
    } catch (error) {
      console.error('Delete failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item(s)",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, actions, operatingNodes, toast]);

  // Handle duplicate
  const handleDuplicate = useCallback(async (destinationPath: string) => {
    try {
      setIsLoading(true);
      const fileSystemManager = FileSystemManager.getInstance();
      
      // Duplicate each file
      for (const node of operatingNodes) {
        if (node.contentType === 'FOLDER') {
          toast({
            title: "Warning",
            description: "Folder duplication is not yet supported",
            variant: "destructive",
          });
          continue;
        }
        
        const sourcePath = node.storagePath || node.itemId;
        const fileName = node.name;
        const extension = node.extension;
        const nameWithoutExt = extension && fileName.endsWith(`.${extension}`)
          ? fileName.substring(0, fileName.length - extension.length - 1)
          : fileName;
        
        // Create destination path with _copy suffix
        const newFileName = extension 
          ? `${nameWithoutExt}_copy.${extension}`
          : `${nameWithoutExt}_copy`;
        const destinationFilePath = destinationPath 
          ? `${destinationPath}/${newFileName}`
          : newFileName;
        
        await fileSystemManager.copyFile(bucketName, sourcePath, destinationFilePath);
      }
      
      // Refresh folder contents
      await dispatch(actions.listContents({ forceFetch: true })).unwrap();
      
      toast({
        title: "Success",
        description: `Duplicated ${operatingNodes.length} ${operatingNodes.length > 1 ? 'items' : 'item'}`,
      });
      
      setActiveModal(null);
    } catch (error) {
      console.error('Duplicate failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to duplicate item(s)",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, actions, operatingNodes, bucketName, toast]);

  // Handle move
  const handleMove = useCallback(async (destinationPath: string) => {
    try {
      setIsLoading(true);
      const fileSystemManager = FileSystemManager.getInstance();
      
      // Move each file
      for (const node of operatingNodes) {
        const sourcePath = node.storagePath || node.itemId;
        const fileName = node.name;
        
        // Create destination path
        const destinationFilePath = destinationPath 
          ? `${destinationPath}/${fileName}`
          : fileName;
        
        await fileSystemManager.moveFile(bucketName, sourcePath, destinationFilePath);
      }
      
      // Refresh folder contents
      await dispatch(actions.listContents({ forceFetch: true })).unwrap();
      
      toast({
        title: "Success",
        description: `Moved ${operatingNodes.length} ${operatingNodes.length > 1 ? 'items' : 'item'}`,
      });
      
      setActiveModal(null);
    } catch (error) {
      console.error('Move failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move item(s)",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, actions, operatingNodes, bucketName, toast]);

  // Handle share
  const handleShare = useCallback(async (shareType: 'public' | 'private', expiresIn?: number) => {
    try {
      setIsLoading(true);
      
      if (shareType === 'public') {
        const result = await dispatch(actions.getPublicFile({
          nodeId: node.itemId,
          expiresIn,
        })).unwrap();
        
        // Copy URL to clipboard
        if (result.url) {
          await navigator.clipboard.writeText(result.url);
          toast({
            title: "Success",
            description: "Public URL copied to clipboard",
          });
        }
      } else {
        // Handle private sharing (to be implemented)
        toast({
          title: "Coming Soon",
          description: "Private sharing will be available soon",
        });
      }
      
      setActiveModal(null);
    } catch (error) {
      console.error('Share failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate share link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, actions, node, toast]);

  // Handle download
  const handleDownload = useCallback(async () => {
    try {
      setIsLoading(true);
      const fileSystemManager = FileSystemManager.getInstance();
      
      const filePath = node.storagePath || node.itemId;
      const blob = await fileSystemManager.downloadFile(bucketName, filePath);
      
      if (!blob) {
        throw new Error('Failed to download file');
      }
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = node.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: `Downloaded ${node.name}`,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [node, bucketName, toast]);

  // Handle view
  const handleView = useCallback(() => {
    if (node.contentType === 'FILE') {
      openPreview(node, bucketName);
    }
  }, [node, bucketName, openPreview]);

  // Handle copy public link
  const handleCopyPublicLink = useCallback(async (makePublic: boolean, expiresIn?: number) => {
    try {
      setIsLoading(true);
      const fileSystemManager = FileSystemManager.getInstance();
      
      const filePath = node.storagePath || node.itemId;
      const urlResult = await fileSystemManager.getFileUrl(
        bucketName,
        filePath,
        { expiresIn: makePublic ? 31536000 : (expiresIn || 3600) } // 1 year for "permanent"
      );
      
      if (urlResult.url) {
        await navigator.clipboard.writeText(urlResult.url);
        toast({
          title: "Success",
          description: makePublic 
            ? "Public link copied to clipboard (permanent)" 
            : "Temporary link copied to clipboard",
        });
      }
      
      setShowPublicLinkModal(false);
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate link",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [node, bucketName, toast]);

  // Handle open (for folders)
  const handleOpen = useCallback(async () => {
    if (node.contentType === 'FOLDER') {
      dispatch(actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false
      }));
      await dispatch(actions.listContents({ forceFetch: false })).unwrap();
    }
  }, [dispatch, actions, node]);

  const menuItems = (
    <>
      {!isMultiSelect && node.contentType === 'FOLDER' && (
        <>
          <ContextMenuItem onClick={handleOpen}>
            <Folder className="h-3.5 w-3.5 mr-2" />
            Open
            <ContextMenuShortcut>Enter</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}
      
      {!isMultiSelect && node.contentType === 'FILE' && (
        <>
          <ContextMenuItem onClick={handleView}>
            <Eye className="h-3.5 w-3.5 mr-2" />
            View
            <ContextMenuShortcut>Space</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setShowFileInfoModal(true)}>
            <Info className="h-3.5 w-3.5 mr-2" />
            File Info
            <ContextMenuShortcut>⌘I</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleDownload}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Download
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      {!isMultiSelect && (
        <ContextMenuItem onClick={openRenameModal}>
          <Edit className="h-3.5 w-3.5 mr-2" />
          Rename
          <ContextMenuShortcut>F2</ContextMenuShortcut>
        </ContextMenuItem>
      )}

      <ContextMenuItem onClick={() => setActiveModal('duplicate')}>
        <Copy className="h-3.5 w-3.5 mr-2" />
        Duplicate
        <ContextMenuShortcut>⌘D</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuItem onClick={() => setActiveModal('move')}>
        <FileInput className="h-3.5 w-3.5 mr-2" />
        Move
        <ContextMenuShortcut>⌘M</ContextMenuShortcut>
      </ContextMenuItem>

      {!isMultiSelect && node.contentType === 'FILE' && (
        <>
          <ContextMenuItem onClick={() => setShowPublicLinkModal(true)}>
            <Link className="h-3.5 w-3.5 mr-2" />
            Copy Public Link
            <ContextMenuShortcut>⌘L</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setActiveModal('share')}>
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Share
            <ContextMenuShortcut>⌘S</ContextMenuShortcut>
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />

      <ContextMenuItem 
        onClick={() => setActiveModal('delete')}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5 mr-2" />
        Delete
        <ContextMenuShortcut>⌫</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  );

  const dropdownItems = (
    <>
      {!isMultiSelect && node.contentType === 'FOLDER' && (
        <>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
            <Folder className="h-3.5 w-3.5 mr-2" />
            Open
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      
      {!isMultiSelect && node.contentType === 'FILE' && (
        <>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleView(); }}>
            <Eye className="h-3.5 w-3.5 mr-2" />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowFileInfoModal(true); }}>
            <Info className="h-3.5 w-3.5 mr-2" />
            File Info
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownload(); }}>
            <Download className="h-3.5 w-3.5 mr-2" />
            Download
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {!isMultiSelect && (
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openRenameModal(); }}>
          <Edit className="h-3.5 w-3.5 mr-2" />
          Rename
        </DropdownMenuItem>
      )}

      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveModal('duplicate'); }}>
        <Copy className="h-3.5 w-3.5 mr-2" />
        Duplicate
      </DropdownMenuItem>

      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveModal('move'); }}>
        <FileInput className="h-3.5 w-3.5 mr-2" />
        Move
      </DropdownMenuItem>

      {!isMultiSelect && node.contentType === 'FILE' && (
        <>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowPublicLinkModal(true); }}>
            <Link className="h-3.5 w-3.5 mr-2" />
            Copy Public Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActiveModal('share'); }}>
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Share
          </DropdownMenuItem>
        </>
      )}

      <DropdownMenuSeparator />

      <DropdownMenuItem 
        onClick={(e) => { e.stopPropagation(); setActiveModal('delete'); }}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5 mr-2" />
        Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <>
      {asDropdown ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
          }}>
            {children}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            {dropdownItems}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            {children}
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            {menuItems}
          </ContextMenuContent>
        </ContextMenu>
      )}

      <FileOperationModals
        bucketName={bucketName}
        deleteModal={{
          isOpen: activeModal === 'delete',
          onClose: () => setActiveModal(null),
          onConfirm: handleDelete,
          nodes: operatingNodes,
        }}
        shareModal={{
          isOpen: activeModal === 'share',
          onClose: () => setActiveModal(null),
          onConfirm: handleShare,
          node,
        }}
        moveModal={{
          isOpen: activeModal === 'move',
          onClose: () => setActiveModal(null),
          onConfirm: handleMove,
          nodes: operatingNodes,
        }}
        duplicateModal={{
          isOpen: activeModal === 'duplicate',
          onClose: () => setActiveModal(null),
          onConfirm: handleDuplicate,
          nodes: operatingNodes,
        }}
      />

      {/* Public Link Modal */}
      <Dialog open={showPublicLinkModal} onOpenChange={setShowPublicLinkModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Copy Public Link
            </DialogTitle>
            <DialogDescription>
              Choose how you want to share {node.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <button
                onClick={() => handleCopyPublicLink(true)}
                disabled={isLoading}
                className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <ExternalLink className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Make Public - Permanent Link</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates a permanent public link that works forever. Anyone with this link can access the file.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleCopyPublicLink(false, 3600)}
                disabled={isLoading}
                className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Share2 className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Temporary Share Link - 1 Hour</h4>
                    <p className="text-sm text-muted-foreground">
                      Creates a temporary link that expires in 1 hour. More secure for sensitive files.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublicLinkModal(false)} disabled={isLoading}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Modal */}
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Rename File
            </DialogTitle>
            <DialogDescription>
              Enter a new name for {node.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-input">File Name</Label>
              <Input
                id="rename-input"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameConfirm();
                  } else if (e.key === 'Escape') {
                    setShowRenameModal(false);
                    setRenameValue('');
                  }
                }}
                autoFocus
              />
              {node.extension && (
                <p className="text-xs text-muted-foreground">
                  Extension .{node.extension} will be added automatically if not included
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRenameModal(false);
                setRenameValue('');
              }} 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameConfirm} disabled={isLoading || !renameValue.trim()}>
              {isLoading ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Renaming...
                </>
              ) : (
                'Rename'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Info Modal */}
      <Dialog open={showFileInfoModal} onOpenChange={setShowFileInfoModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              File Information
            </DialogTitle>
            <DialogDescription>
              Detailed information about {node.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">File Name</label>
                  <p className="text-sm mt-1 break-all">{node.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Extension</label>
                  <p className="text-sm mt-1">{node.extension || 'None'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <p className="text-sm mt-1">{node.contentType}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Bucket</label>
                  <p className="text-sm mt-1">{bucketName}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Size</label>
                  <p className="text-sm mt-1">
                    {node.metadata?.size 
                      ? `${(node.metadata.size / 1024).toFixed(2)} KB (${node.metadata.size.toLocaleString()} bytes)` 
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">MIME Type</label>
                  <p className="text-sm mt-1">{node.metadata?.mimetype || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Last Modified</label>
                  <p className="text-sm mt-1">
                    {node.metadata?.lastModified 
                      ? new Date(node.metadata.lastModified).toLocaleString()
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Created</label>
                  <p className="text-sm mt-1">
                    {node.metadata?.created_at 
                      ? new Date(node.metadata.created_at).toLocaleString()
                      : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Path */}
            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground">Storage Path</label>
              <p className="text-xs mt-1 font-mono bg-muted p-2 rounded break-all">
                {node.storagePath || node.itemId}
              </p>
            </div>

            {/* Privacy Information */}
            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Privacy & Access</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs font-medium">File Status</p>
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">Determined by bucket</span>
                  </p>
                </div>
                <div className="bg-muted p-3 rounded">
                  <p className="text-xs font-medium">Bucket</p>
                  <p className="text-sm mt-1 font-mono">{bucketName}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Note: File access is determined by bucket privacy settings. Some buckets are public, others require authentication.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Quick Actions</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    handleView();
                  }}
                  className="w-full"
                >
                  <Eye className="h-3.5 w-3.5 mr-2" />
                  View File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    setShowPublicLinkModal(true);
                  }}
                  className="w-full"
                >
                  <Link className="h-3.5 w-3.5 mr-2" />
                  Get Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    setActiveModal('duplicate');
                  }}
                  className="w-full"
                >
                  <Copy className="h-3.5 w-3.5 mr-2" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    handleDownload();
                  }}
                  className="w-full"
                >
                  <Download className="h-3.5 w-3.5 mr-2" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    setActiveModal('move');
                  }}
                  className="w-full"
                >
                  <FileInput className="h-3.5 w-3.5 mr-2" />
                  Move
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    openRenameModal();
                  }}
                  className="w-full"
                >
                  <Edit className="h-3.5 w-3.5 mr-2" />
                  Rename
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    setActiveModal('share');
                  }}
                  className="w-full"
                >
                  <Share2 className="h-3.5 w-3.5 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFileInfoModal(false);
                    handleDelete();
                  }}
                  className="w-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </Button>
              </div>
            </div>

            {node.metadata?.httpStatusCode && (
              <div className="pt-2 border-t">
                <label className="text-xs font-medium text-muted-foreground">HTTP Status</label>
                <p className="text-sm mt-1">{node.metadata.httpStatusCode}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowFileInfoModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

