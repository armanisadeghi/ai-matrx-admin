import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const nodeTypes = {
  trigger: { bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-500' },
  action: { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-500' },
  condition: { bg: 'bg-yellow-100 dark:bg-yellow-900', border: 'border-yellow-500' },
  output: { bg: 'bg-purple-100 dark:bg-purple-900', border: 'border-purple-500' },
};

const DraggableNode = ({ id, type, isTemplate = false, isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: isTemplate ? `template_${type}` : id,
    data: {
      type,
      isTemplate,
    },
  });

  const styles = nodeTypes[type];

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`
        ${styles.bg} ${styles.border}
        border-2 rounded-lg p-4 w-48
        cursor-move select-none
        ${isDragging || isOverlay ? 'opacity-50 shadow-lg scale-105' : ''}
        transition-all duration-200
      `}
    >
      <div className="font-medium text-center capitalize">{type}</div>
    </div>
  );
};

// Rest of the WorkflowBuilder component remains the same
const WorkflowCanvas = ({ nodes, onNodeAdd }) => {
  const { setNodeRef } = useDroppable({
    id: 'canvas',
  });

  return (
    <div
      ref={setNodeRef}
      className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 min-h-[400px] relative"
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {nodes.map((node) => (
          <DraggableNode key={node.id} id={node.id} type={node.type} />
        ))}
      </div>
    </div>
  );
};

const WorkflowBuilder = () => {
  const [nodes, setNodes] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);

    if (!over) return;

    const isTemplate = active.data.current?.isTemplate;
    
    if (isTemplate && over.id === 'canvas') {
      const type = active.data.current.type;
      const newNode = {
        id: `${type}_${Date.now()}`,
        type,
        position: { x: 0, y: 0 },
      };
      
      setNodes((nodes) => [...nodes, newNode]);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-6">
            <ScrollArea className="w-full">
              <div className="flex gap-4 p-2">
                {Object.keys(nodeTypes).map((type) => (
                  <DraggableNode
                    key={type}
                    id={`template_${type}`}
                    type={type}
                    isTemplate
                  />
                ))}
              </div>
            </ScrollArea>

            <WorkflowCanvas
              nodes={nodes}
              onNodeAdd={(node) => setNodes((prev) => [...prev, node])}
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <DraggableNode
                id={activeId}
                type={activeId.split('_')[1]}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
};

export default WorkflowBuilder;