"use client";

import React, { forwardRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ChevronDown } from "lucide-react";

// Presentational TreeItem component
interface TreeItemContentProps {
  depth: number;
  children: React.ReactNode;
  onCollapse: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  data: { name: string };
  className?: string;
  style?: React.CSSProperties;
}

const TreeItemContent = forwardRef<HTMLDivElement, TreeItemContentProps>(
  (
    {
      depth,
      children,
      onCollapse,
      onExpand,
      isExpanded,
      data,
      className,
      style,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        style={style}
        className={`pl-${depth * 4} select-none ${className}`}
        {...props}
      >
        <div className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          {children?.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                isExpanded ? onCollapse() : onExpand();
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          )}
          <div className="flex-1">{data.name}</div>
        </div>
      </div>
    );
  }
);

TreeItemContent.displayName = "TreeItemContent";

// Sortable TreeItem wrapper
const SortableTreeItem = ({
  id,
  data,
  depth,
  children,
  onCollapse,
  onExpand,
  isExpanded,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TreeItemContent
      ref={setNodeRef}
      depth={depth}
      data={data}
      children={children}
      onCollapse={() => onCollapse(id)}
      onExpand={() => onExpand(id)}
      isExpanded={isExpanded}
      className={isDragging ? "opacity-50" : ""}
      style={style}
      {...attributes}
      {...listeners}
    />
  );
};

const TreeRoot = () => {
  const [items, setItems] = useState({
    root: {
      id: "root",
      children: ["1", "2"],
      isExpanded: true,
      data: { name: "Root" },
    },
    "1": {
      id: "1",
      children: ["3", "4"],
      isExpanded: false,
      data: { name: "Branch 1" },
    },
    "2": {
      id: "2",
      children: [],
      isExpanded: false,
      data: { name: "Branch 2" },
    },
    "3": {
      id: "3",
      children: [],
      isExpanded: false,
      data: { name: "Leaf 1" },
    },
    "4": {
      id: "4",
      children: [],
      isExpanded: false,
      data: { name: "Leaf 2" },
    },
  });

  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const flattenTree = (items, id = "root", depth = 0) => {
    const item = items[id];
    const result = [];

    if (!item) return result;

    result.push({ ...item, depth });

    if (item.isExpanded && item.children) {
      item.children.forEach((childId) => {
        result.push(...flattenTree(items, childId, depth + 1));
      });
    }

    return result;
  };

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);

    if (!over) return;

    if (active.id === over.id) return;

    setItems((items) => {
      const activeParentId = Object.entries(items).find(([, item]) =>
        item.children?.includes(active.id)
      )?.[0];

      const overParentId = Object.entries(items).find(([, item]) =>
        item.children?.includes(over.id)
      )?.[0];

      if (!activeParentId || !overParentId) return items;

      const activeParent = items[activeParentId];
      const overParent = items[overParentId];

      const activeIndex = activeParent.children.indexOf(active.id);
      const overIndex = overParent.children.indexOf(over.id);

      const newItems = { ...items };

      if (activeParentId === overParentId) {
        // Reorder within same parent
        const newChildren = [...activeParent.children];
        newChildren.splice(activeIndex, 1);
        newChildren.splice(overIndex, 0, active.id);
        newItems[activeParentId] = {
          ...activeParent,
          children: newChildren,
        };
      } else {
        // Move between different parents
        const newActiveChildren = [...activeParent.children];
        const newOverChildren = [...overParent.children];
        newActiveChildren.splice(activeIndex, 1);
        newOverChildren.splice(overIndex, 0, active.id);
        newItems[activeParentId] = {
          ...activeParent,
          children: newActiveChildren,
        };
        newItems[overParentId] = {
          ...overParent,
          children: newOverChildren,
        };
      }

      return newItems;
    });
  };

  const handleExpand = (id) => {
    setItems((items) => ({
      ...items,
      [id]: { ...items[id], isExpanded: true },
    }));
  };

  const handleCollapse = (id) => {
    setItems((items) => ({
      ...items,
      [id]: { ...items[id], isExpanded: false },
    }));
  };

  const flattenedItems = flattenTree(items);
  const activeItem = activeId ? items[activeId] : null;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={flattenedItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {flattenedItems.map((item) => (
              <SortableTreeItem
                key={item.id}
                id={item.id}
                data={item.data}
                depth={item.depth}
                children={item.children}
                isExpanded={item.isExpanded}
                onExpand={handleExpand}
                onCollapse={handleCollapse}
              />
            ))}
          </SortableContext>

          <DragOverlay
            dropAnimation={{
              duration: 500,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeId ? (
              <TreeItemContent
                depth={0}
                data={activeItem.data}
                children={[]}
                className="shadow-lg ring-2 ring-primary"
                onCollapse={function (): void {
                  throw new Error("Function not implemented.");
                }}
                onExpand={function (): void {
                  throw new Error("Function not implemented.");
                }}
                isExpanded={false}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
};

export default TreeRoot;
