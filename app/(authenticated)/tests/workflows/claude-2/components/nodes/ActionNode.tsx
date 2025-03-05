// 7. Node Components
// src/components/workflow/nodes/ActionNode.jsx
import React, { forwardRef } from 'react';
import { Circle, MoreHorizontal } from 'lucide-react';
import { useWorkflow } from '../WorkflowContext';
import { COLORS } from '../../workflowData';
import { CATEGORIES } from '../../workflowData';

const ActionNode = forwardRef<HTMLDivElement, {
  node: any;
  isSelected: boolean;
  scale: number;
}>((props, ref) => {
  const { node, isSelected, scale } = props;
  const { 
    selectNode, 
    updateNodePosition, 
    setDraggingNode, 
    startConnectionDrag, 
    completeConnection 
  } = useWorkflow();

  const handleDragStart = (e) => {
    e.stopPropagation();
    setDraggingNode(node.id);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (e.clientX > 0 && e.clientY > 0 && ref && 'current' in ref && ref.current) {
      const rect = (ref.current as HTMLDivElement).getBoundingClientRect();
      const canvasRect = (ref.current as HTMLDivElement).closest('[data-canvas]')?.getBoundingClientRect();
      
      // Calculate new position
      const x = (e.clientX - canvasRect.left) / scale;
      const y = (e.clientY - canvasRect.top) / scale;
      
      // Add offset
      const offsetX = rect.width / 2;
      const offsetY = 20; // From the top of the element
      
      updateNodePosition(node.id, { x: x - offsetX, y: y - offsetY });
    }
  };

  const icon = CATEGORIES[node.category] ? CATEGORIES[node.category] : <Circle size={18} />;

  return (
    <div 
      ref={ref}
      className={`absolute cursor-grab rounded-lg border shadow-md transition-all ${COLORS.action.bg} ${COLORS.action.border} ${COLORS.action.shadow}
        ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.shadow} ring-1 ring-cyan-500 shadow-lg` : ''}`}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        zIndex: isSelected ? 10 : 1,
        minWidth: '180px',
        transform: `scale(${scale})`,
        transformOrigin: 'center top'
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(node.id);
      }}
      draggable="true"
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={() => setDraggingNode(null)}
    >
      <div className={`flex items-center justify-between p-2 border-b ${COLORS.action.border} ${COLORS.action.text}`}>
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium">{node.name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <button className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded p-1">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>
      
      {/* Inputs */}
      {node.inputs && node.inputs.length > 0 && (
        <div className="px-2 py-1">
          {node.inputs.map((input, idx) => (
            <div 
              key={`input-${idx}`}
              className="flex items-center my-1 group"
            >
              <div 
                className={`w-3 h-3 rounded-full border cursor-pointer ${COLORS.input.border} ${COLORS.input.bg} -ml-1.5 mr-2`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  completeConnection(node.id, input.name);
                }}
              ></div>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                {input.name}{input.required ? '*' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* Outputs */}
      {node.outputs && node.outputs.length > 0 && (
        <div className="border-t px-2 py-1 border-gray-200 dark:border-gray-700">
          {node.outputs.map((output, idx) => (
            <div 
              key={`output-${idx}`}
              className="flex items-center justify-between my-1 group"
            >
              <span className="text-xs text-gray-700 dark:text-gray-300">{output.name}</span>
              <div 
                className={`w-3 h-3 rounded-full border cursor-pointer ${COLORS.output.border} ${COLORS.output.bg} mr-0 ml-2`}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  startConnectionDrag(node.id, output.name, true);
                }}
              ></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default ActionNode;
