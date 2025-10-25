// MultiBucketFileTree.tsx
'use client';

import React, { useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import { useFileSystem } from '@/lib/redux/fileSystem/Provider';
import { createFileSystemSelectors } from '@/lib/redux/fileSystem/selectors';
import { createFileSystemSlice } from '@/lib/redux/fileSystem/slice';
import { FileSystemNode, AvailableBuckets } from '@/lib/redux/fileSystem/types';
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
import { File, Folder, ChevronRight, ChevronDown, Database } from 'lucide-react';
import { FileTreeSkeleton } from './FileTreeSkeleton';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const FilePreviewSheet = dynamic(
  () => import('@/components/ui/file-preview/FilePreviewSheet'),
  { ssr: false }
);

interface MultiBucketFileTreeProps {
  buckets?: AvailableBuckets[];
  defaultExpandedBuckets?: AvailableBuckets[];
  onViewFile?: (node: FileSystemNode) => void;
  onBucketSelect?: (bucket: AvailableBuckets) => void;
}

interface BucketSectionProps {
  bucketName: AvailableBuckets;
  isExpanded: boolean;
  onToggle: () => void;
  onViewFile?: (node: FileSystemNode) => void;
  onBucketSelect?: (bucket: AvailableBuckets) => void;
}

function BucketSection({ bucketName, isExpanded, onToggle, onViewFile, onBucketSelect }: BucketSectionProps) {
  const dispatch = useAppDispatch();
  const slice = createFileSystemSlice(bucketName);
  const selectors = createFileSystemSelectors(bucketName);
  const { actions } = slice;

  const allNodes = useAppSelector(selectors.selectAllNodes);
  const selectedNodes = useAppSelector(selectors.selectSelectedNodes);
  const isLoading = useAppSelector(selectors.selectIsLoading);
  const isInitialized = useAppSelector(selectors.selectIsInitialized);
  const rootNodes = allNodes.filter(node => node.parentId === "root");
  
  // Notify parent when any node in this bucket is selected
  React.useEffect(() => {
    if (selectedNodes.length > 0 && onBucketSelect) {
      onBucketSelect(bucketName);
    }
  }, [selectedNodes.length, bucketName, onBucketSelect]);

  const [selectionRange, setSelectionRange] = useState<SelectionRange>({
    start: null,
    end: null
  });

  const [activeId, setActiveId] = useState<string | null>(null);

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
    // Handle drag over logic
  }, []);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const overId = (over.id as string).replace('folder-', '');
    const activeId = active.id as string;

    if (activeId === overId) return;

    const targetFolder = allNodes.find(node => node.itemId === overId);
    if (!targetFolder || targetFolder.contentType !== 'FOLDER') return;

    const dragData = active.data.current as DragData;

    try {
      if (dragData.isMultiDrag) {
        await dispatch(actions.moveSelections({ newPath: overId })).unwrap();
        await dispatch(actions.listContents({ forceFetch: true })).unwrap();
      } else {
        dispatch(actions.selectNode({
          nodeId: activeId,
          isMultiSelect: false,
          isRangeSelect: false
        }));

        await dispatch(actions.moveSelections({ newPath: overId })).unwrap();
        await dispatch(actions.listContents({ forceFetch: true })).unwrap();
      }
    } catch (error) {
      console.error('Failed to move items:', error);
    }
  };

  // Load bucket contents when expanded
  React.useEffect(() => {
    if (isExpanded && !isInitialized) {
      dispatch(actions.listContents({ forceFetch: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, isInitialized, dispatch]);

  const activeNode = activeId ? allNodes.find(node => node.itemId === activeId) : null;

  return (
    <div className="mb-0.5">
      {/* Bucket Header */}
      <div
        className="flex items-center py-1 px-1 hover:bg-accent/50 cursor-pointer text-xs font-medium"
        onClick={onToggle}
      >
        <span className="h-3.5 w-3.5 flex items-center justify-center flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </span>
        <Database className="h-3.5 w-3.5 text-primary mx-1 flex-shrink-0" />
        <span className="font-medium">{bucketName}</span>
      </div>

      {/* Bucket Contents */}
      {isExpanded && (
        <div className="ml-3">
          {!isInitialized || (isLoading && rootNodes.length === 0) ? (
            <FileTreeSkeleton rows={5} />
          ) : (
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
                {rootNodes.length > 0 ? (
                  <div className="py-0.5">
                    {rootNodes.map((node) => (
                      <NodeItem
                        key={node.itemId}
                        node={node}
                        level={0}
                        selectionRange={selectionRange}
                        onUpdateSelectionRange={setSelectionRange}
                        onViewFile={onViewFile}
                        bucketName={bucketName}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16">
                    <p className="text-xs text-muted-foreground">Empty bucket</p>
                  </div>
                )}
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
          )}
        </div>
      )}
    </div>
  );
}

export default function MultiBucketFileTree({
  buckets,
  defaultExpandedBuckets = [],
  onViewFile,
  onBucketSelect
}: MultiBucketFileTreeProps) {
  const { availableBuckets } = useFileSystem();
  const bucketsToShow = buckets || availableBuckets;

  const [expandedBuckets, setExpandedBuckets] = useState<Set<AvailableBuckets>>(
    new Set(defaultExpandedBuckets)
  );

  const [viewingFile, setViewingFile] = useState<FileSystemNode | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');

  const toggleBucket = useCallback((bucketName: AvailableBuckets) => {
    setExpandedBuckets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bucketName)) {
        newSet.delete(bucketName);
      } else {
        newSet.add(bucketName);
      }
      return newSet;
    });
  }, []);

  const handleViewFile = useCallback(async (node: FileSystemNode) => {
    if (node.contentType !== 'FILE') return;

    if (onViewFile) {
      onViewFile(node);
    } else {
      // Default preview behavior
      setViewingFile(node);
      // You would typically fetch the file URL here
    }
  }, [onViewFile]);

  return (
    <>
      <div className="h-full overflow-y-auto overflow-x-hidden">
        {bucketsToShow.length > 0 ? (
          <div className="py-0.5">
            {bucketsToShow.map((bucketName) => (
              <BucketSection
                key={bucketName}
                bucketName={bucketName}
                isExpanded={expandedBuckets.has(bucketName)}
                onToggle={() => toggleBucket(bucketName)}
                onViewFile={handleViewFile}
                onBucketSelect={onBucketSelect}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p className="text-xs text-muted-foreground">No buckets available</p>
          </div>
        )}
      </div>

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

