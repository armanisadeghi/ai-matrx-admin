// FileTree.tsx
import React, { useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
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

export default function FileTree() {
  const dispatch = useAppDispatch();
  const { activeBucket } = useFileSystem();
  const slice = createFileSystemSlice(activeBucket);
  const selectors = createFileSystemSelectors(activeBucket);
  const { actions } = slice;
  
  const allNodes = useAppSelector(selectors.selectAllNodes);
  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const rootNodes = allNodes.filter(node => node.parentId === "root");
  
  const [selectionRange, setSelectionRange] = useState<SelectionRange>({
    start: null,
    end: null
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  
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

  return (
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
        <div className="min-h-[300px]">
          {rootNodes.length > 0 ? (
            rootNodes.map((node) => (
              <NodeItem
                key={node.itemId}
                node={node}
                level={0}
                selectionRange={selectionRange}
                onUpdateSelectionRange={setSelectionRange}
              />
            ))
          ) : (
            <div className="p-4 text-muted-foreground">
              No items found
            </div>
          )}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{
        duration: 500,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeNode && (
          <div className="flex items-center py-1 px-2 bg-background border rounded-sm shadow-lg">
            {activeNode.contentType === 'FOLDER' ? (
              <Folder className="h-4 w-4 text-blue-500 mx-2" />
            ) : (
              <File className="h-4 w-4 text-gray-500 mx-2" />
            )}
            <span>{activeNode.name}</span>
            {selectedNodes.length > 1 && (
              <span className="ml-2 text-xs text-muted-foreground">
                +{selectedNodes.length - 1} items
              </span>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}