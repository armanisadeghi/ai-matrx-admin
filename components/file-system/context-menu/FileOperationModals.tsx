// FileOperationModals.tsx
"use client";
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileSystemNode } from "@/lib/redux/fileSystem/types";
import { AlertTriangle, Trash2, Share2, Copy, FolderInput } from 'lucide-react';
import { Spinner } from '@/components/ui/loaders/Spinner';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/components/ui/select';

interface FileOperationModalsProps {
  deleteModal: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    nodes: FileSystemNode[];
  };
  shareModal: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (shareType: 'public' | 'private', expiresIn?: number) => Promise<void>;
    node: FileSystemNode | null;
  };
  moveModal: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (destinationPath: string) => Promise<void>;
    nodes: FileSystemNode[];
  };
  duplicateModal: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (newPath: string) => Promise<void>;
    nodes: FileSystemNode[];
  };
}

export function FileOperationModals({
  deleteModal,
  shareModal,
  moveModal,
  duplicateModal,
}: FileOperationModalsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  
  const [shareType, setShareType] = useState<'public' | 'private'>('private');
  const [expiresIn, setExpiresIn] = useState('3600');
  const [destinationPath, setDestinationPath] = useState('');
  const [duplicatePath, setDuplicatePath] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteModal.onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareModal.onConfirm(shareType, shareType === 'public' ? parseInt(expiresIn) : undefined);
    } finally {
      setIsSharing(false);
    }
  };

  const handleMove = async () => {
    if (!destinationPath.trim()) return;
    setIsMoving(true);
    try {
      await moveModal.onConfirm(destinationPath);
      setDestinationPath('');
    } finally {
      setIsMoving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!duplicatePath.trim()) return;
    setIsDuplicating(true);
    try {
      await duplicateModal.onConfirm(duplicatePath);
      setDuplicatePath('');
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteModal.isOpen} onOpenChange={deleteModal.onClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {deleteModal.nodes.length > 1 ? 'Items' : 'Item'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete{' '}
                {deleteModal.nodes.length > 1 
                  ? `${deleteModal.nodes.length} items` 
                  : deleteModal.nodes[0]?.name}?
              </p>
              <p className="text-destructive text-sm font-medium">
                This action cannot be undone.
              </p>
              {deleteModal.nodes.length > 1 && (
                <div className="mt-2 max-h-32 overflow-y-auto text-xs bg-muted p-2 rounded">
                  {deleteModal.nodes.map(node => (
                    <div key={node.itemId} className="truncate">• {node.name}</div>
                  ))}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      <Dialog open={shareModal.isOpen} onOpenChange={shareModal.onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share {shareModal.node?.name}
            </DialogTitle>
            <DialogDescription>
              Configure sharing settings for this file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <RadioGroup value={shareType} onValueChange={(val) => setShareType(val as 'public' | 'private')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer">
                  Private - Share with specific users
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer">
                  Public - Anyone with the link
                </Label>
              </div>
            </RadioGroup>
            
            {shareType === 'public' && (
              <div className="space-y-2">
                <Label htmlFor="expires">Link expires in</Label>
                <Select
                  value={expiresIn}
                  onValueChange={(value) => setExpiresIn(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3600">1 hour</SelectItem>
                    <SelectItem value="86400">1 day</SelectItem>
                    <SelectItem value="604800">1 week</SelectItem>
                    <SelectItem value="2592000">1 month</SelectItem>
                    <SelectItem value="31536000">1 year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={shareModal.onClose} disabled={isSharing}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isSharing}>
              {isSharing ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Sharing...
                </>
              ) : (
                'Share'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Modal */}
      <Dialog open={moveModal.isOpen} onOpenChange={moveModal.onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderInput className="h-5 w-5" />
              Move {moveModal.nodes.length > 1 ? `${moveModal.nodes.length} Items` : moveModal.nodes[0]?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the destination path for the {moveModal.nodes.length > 1 ? 'items' : 'item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination Path</Label>
              <Input
                id="destination"
                placeholder="folder/subfolder"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
              />
            </div>
            {moveModal.nodes.length > 1 && (
              <div className="text-xs bg-muted p-2 rounded max-h-24 overflow-y-auto">
                <div className="font-medium mb-1">Moving:</div>
                {moveModal.nodes.map(node => (
                  <div key={node.itemId} className="truncate">• {node.name}</div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={moveModal.onClose} disabled={isMoving}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={isMoving || !destinationPath.trim()}>
              {isMoving ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Moving...
                </>
              ) : (
                'Move'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Modal */}
      <Dialog open={duplicateModal.isOpen} onOpenChange={duplicateModal.onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate {duplicateModal.nodes.length > 1 ? `${duplicateModal.nodes.length} Items` : duplicateModal.nodes[0]?.name}
            </DialogTitle>
            <DialogDescription>
              Enter the destination path for the duplicated {duplicateModal.nodes.length > 1 ? 'items' : 'item'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-path">Destination Path</Label>
              <Input
                id="duplicate-path"
                placeholder="folder/subfolder"
                value={duplicatePath}
                onChange={(e) => setDuplicatePath(e.target.value)}
              />
            </div>
            {duplicateModal.nodes.length > 1 && (
              <div className="text-xs bg-muted p-2 rounded max-h-24 overflow-y-auto">
                <div className="font-medium mb-1">Duplicating:</div>
                {duplicateModal.nodes.map(node => (
                  <div key={node.itemId} className="truncate">• {node.name}</div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={duplicateModal.onClose} disabled={isDuplicating}>
              Cancel
            </Button>
            <Button onClick={handleDuplicate} disabled={isDuplicating || !duplicatePath.trim()}>
              {isDuplicating ? (
                <>
                  <Spinner size="xs" className="mr-2" />
                  Duplicating...
                </>
              ) : (
                'Duplicate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

