// FileTree.tsx
import React, { useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { FileSystemNode } from '@/lib/redux/fileSystem/types';
import { NodeItem } from './NodeItem';
import { SelectionRange, DragData } from '../types';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { File, Folder } from 'lucide-react';
import { FileTreeSkeleton } from './FileTreeSkeleton';
import dynamic from 'next/dynamic';

const FilePreviewSheet = dynamic(
  () => import('@/components/ui/file-preview/FilePreviewSheet'),
  { ssr: false }
);

export default function FileTree() {
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const selectors = createFileSystemSelectors(activeBucket);
  const { actions } = slice;
  
  const allNodes = useAppSelector(selectors.selectAllNodes);
  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const isLoading = useAppSelector(selectors.selectIsLoading);
  const isInitialized = useAppSelector(selectors.selectIsInitialized);
  const rootNodes = allNodes.filter(node => node.parentId === "root");
  
  const [selectionRange, setSelectionRange] = useState<SelectionRange>({
    start: null,
    end: null
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<FileSystemNode | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
  };

  const handleDragOver = useCallback((event) => {
    const { over } = event;
    setOverId(over ? over.id as string : null);
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    
    if (!over) return;

    // Extract the actual folder ID from the droppable ID
    const overId = (over.id as string).replace('folder-', '');
    const activeId = active.id as string;
    
    // Don't do anything if dropping on itself
    if (activeId === overId) return;
    
    // Get the target folder node
    const targetFolder = allNodes.find(node => node.itemId === overId);
    if (!targetFolder || targetFolder.contentType !== 'FOLDER') return;

    const dragData = active.data.current as DragData;
    
    try {
      if (dragData.isMultiDrag) {
        // Move all selected items
        await dispatch(actions.moveSelections({
          newPath: overId
        })).unwrap();

        // Refresh the folder contents
        await dispatch(actions.listContents({
          forceFetch: true,
        })).unwrap();
      } else {
        // Move single item
        dispatch(actions.selectNode({
          nodeId: activeId,
          isMultiSelect: false,
          isRangeSelect: false
        }));
        
        await dispatch(actions.moveSelections({
          newPath: overId
        })).unwrap();

        // Refresh the folder contents
        await dispatch(actions.listContents({
          forceFetch: true,
        })).unwrap();
      }
    } catch (error) {
      console.error('Failed to move items:', error);
      // Here you could add error handling UI feedback
    }
  };

  // Find the active node for the overlay
  const activeNode = activeId ? allNodes.find(node => node.itemId === activeId) : null;

  // Handle file viewing
  const handleViewFile = useCallback(async (node: FileSystemNode) => {
    if (node.contentType !== 'FILE') return;
    
    try {
      // Select the node first
      dispatch(actions.selectNode({
        nodeId: node.itemId,
        isMultiSelect: false,
        isRangeSelect: false
      }));

      // Get public URL for the file
      const result = await dispatch(actions.getPublicFile({
        nodeId: node.itemId,
        expiresIn: 3600, // 1 hour
      })).unwrap();
      
      if (result.url) {
        setFilePreviewUrl(result.url);
        setViewingFile(node);
      }
    } catch (error) {
      console.error('Failed to get file URL:', error);
      // Show error toast
      console.error('Error details:', error);
    }
  }, [dispatch, actions]);

  // Loading state
  if (!isInitialized || (isLoading && rootNodes.length === 0)) {
    return <FileTreeSkeleton rows={10} />;
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={allNodes.map(node => node.itemId)}
          strategy={verticalListSortingStrategy}
        >
          <div className="h-full overflow-y-auto overflow-x-hidden">
            {rootNodes.length > 0 ? (
              <div className="py-0.5">
                {rootNodes.map((node) => (
                  <NodeItem
                    key={node.itemId}
                    node={node}
                    level={0}
                    selectionRange={selectionRange}
                    onUpdateSelectionRange={setSelectionRange}
                    onViewFile={handleViewFile}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32">
                <p className="text-xs text-muted-foreground">No items found</p>
              </div>
            )}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={{
          duration: 500,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeNode && (
            <div className="flex items-center py-0.5 px-1.5 bg-background border rounded-sm shadow-lg text-xs">
              {activeNode.contentType === 'FOLDER' ? (
                <Folder className="h-3.5 w-3.5 text-blue-500 mr-1.5" />
              ) : (
                <File className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
              )}
              <span className="truncate max-w-[200px]">{activeNode.name}</span>
              {selectedNodes.length > 1 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  +{selectedNodes.length - 1}
                </span>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {viewingFile && filePreviewUrl && (
        <FilePreviewSheet
          isOpen={!!viewingFile}
          onClose={() => {
            setViewingFile(null);
            setFilePreviewUrl('');
          }}
          file={{
            url: filePreviewUrl,
            type: viewingFile.metadata?.mimetype || '',
            details: {
              localId: viewingFile.itemId,
              name: viewingFile.name,
              extension: viewingFile.extension,
              mimetype: viewingFile.metadata?.mimetype,
              size: viewingFile.metadata?.size,
            } as any
          }}
        />
      )}
    </>
  );
}