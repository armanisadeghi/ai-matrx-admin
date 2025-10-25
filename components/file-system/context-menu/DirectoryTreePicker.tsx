"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/loaders/Spinner';

interface DirectoryTreePickerProps {
  bucketName: AvailableBuckets;
  onSelect: (path: string) => void;
  selectedPath?: string;
  excludePaths?: string[]; // Paths to exclude from selection (e.g., the file being moved)
}

export function DirectoryTreePicker({
  bucketName,
  onSelect,
  selectedPath,
  excludePaths = []
}: DirectoryTreePickerProps) {
  const dispatch = useAppDispatch();
  const slice = createFileSystemSlice(bucketName);
  const selectors = createFileSystemSelectors(bucketName);
  const { actions } = slice;

  const rootNodes = useAppSelector(selectors.selectVisibleChildren);
  const allNodes = useAppSelector(selectors.selectAllNodes);
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['ROOT']));
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set());

  // Load root contents on mount
  useEffect(() => {
    dispatch(actions.listContents({ forceFetch: false }));
  }, [dispatch, actions]);

  const toggleFolder = useCallback(async (folder: FileSystemNode) => {
    const folderId = folder.itemId;
    
    if (expandedFolders.has(folderId)) {
      // Collapse folder
      setExpandedFolders(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    } else {
      // Expand folder
      setExpandedFolders(prev => new Set(prev).add(folderId));
      
      // Load contents if not already loaded
      if (!folder.children || folder.children.length === 0) {
        setLoadingFolders(prev => new Set(prev).add(folderId));
        try {
          await dispatch(actions.listContents({ 
            parentId: folderId,
            forceFetch: false 
          })).unwrap();
        } catch (error) {
          console.error('Failed to load folder contents:', error);
        } finally {
          setLoadingFolders(prev => {
            const next = new Set(prev);
            next.delete(folderId);
            return next;
          });
        }
      }
    }
  }, [expandedFolders, dispatch, actions]);

  const handleSelectFolder = useCallback((folder: FileSystemNode) => {
    const path = folder.storagePath || folder.itemId;
    onSelect(path);
  }, [onSelect]);

  const isExcluded = useCallback((path: string) => {
    return excludePaths.some(excluded => path.startsWith(excluded) || excluded.startsWith(path));
  }, [excludePaths]);

  const renderFolder = useCallback((folder: FileSystemNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.itemId);
    const isLoading = loadingFolders.has(folder.itemId);
    const isSelected = selectedPath === (folder.storagePath || folder.itemId);
    const isExcludedFolder = isExcluded(folder.storagePath || folder.itemId);
    
    const children = folder.children
      ?.map(childId => allNodes[childId])
      .filter(child => child && child.contentType === 'FOLDER')
      .filter(child => !isExcluded(child.storagePath || child.itemId)) || [];

    return (
      <div key={folder.itemId}>
        <div
          className={cn(
            "flex items-center gap-1 py-1 px-2 hover:bg-accent rounded cursor-pointer transition-colors",
            isSelected && "bg-accent font-medium",
            isExcludedFolder && "opacity-50 cursor-not-allowed"
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isExcludedFolder) {
              handleSelectFolder(folder);
            }
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isExcludedFolder) {
                toggleFolder(folder);
              }
            }}
            className="flex-shrink-0 p-0.5 hover:bg-accent-foreground/10 rounded"
            disabled={isExcludedFolder}
          >
            {isLoading ? (
              <Spinner size="xs" className="h-3.5 w-3.5" />
            ) : isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
          
          {isExpanded ? (
            <FolderOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          ) : (
            <Folder className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          )}
          
          <span className="text-sm truncate flex-1">{folder.name}</span>
        </div>

        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedFolders, loadingFolders, selectedPath, allNodes, isExcluded, handleSelectFolder, toggleFolder]);

  // Get only folders from root
  const rootFolders = rootNodes.filter(node => 
    node.contentType === 'FOLDER' && !isExcluded(node.storagePath || node.itemId)
  );

  return (
    <div className="border rounded-md">
      <ScrollArea className="h-[300px]">
        <div className="p-2">
          {/* Root/Bucket level */}
          <div
            className={cn(
              "flex items-center gap-2 py-1 px-2 hover:bg-accent rounded cursor-pointer transition-colors mb-1",
              selectedPath === '' && "bg-accent font-medium"
            )}
            onClick={() => onSelect('')}
          >
            <FolderOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">/ (Root)</span>
          </div>

          {/* Folder tree */}
          {rootFolders.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              No folders found
            </div>
          ) : (
            rootFolders.map(folder => renderFolder(folder, 0))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

