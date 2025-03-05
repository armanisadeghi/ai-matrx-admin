// 8. Broker Node Component
// src/components/workflow/nodes/BrokerNode.jsx
import React, { forwardRef } from 'react';
import { GitBranch } from 'lucide-react';
import { useWorkflow } from '../WorkflowContext';
import { COLORS } from '../../workflowData';

const BrokerNode = forwardRef<HTMLDivElement, {
  broker: any;
  isSelected: boolean;
  scale: number;
}>(({ broker, isSelected, scale }, ref) => {
  const { 
    selectNode, 
    updateNodePosition, 
    setDraggingNode, 
    startConnectionDrag, 
    completeConnection 
  } = useWorkflow();

  return (
    <div 
      ref={ref}
      className={`absolute cursor-grab rounded-lg border shadow-md transition-all ${COLORS.broker.bg} ${COLORS.broker.border} ${COLORS.broker.shadow}
        ${isSelected ? `${COLORS.selected.border} ${COLORS.selected.shadow} ring-1 ring-cyan-500 shadow-lg` : ''}`}
      style={{
        left: `${broker.position.x}px`,
        top: `${broker.position.y}px`,
        zIndex: isSelected ? 10 : 1,
        width: '160px',
        transform: `scale(${scale})`,
        transformOrigin: 'center top'
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(broker.id);
      }}
      draggable="true"
      onDragStart={(e) => {
        e.stopPropagation();
        setDraggingNode(broker.id);
      }}
      onDrag={(e: React.DragEvent) => {
        if (e.clientX > 0 && e.clientY > 0 && ref && 'current' in ref && ref.current) {
          const rect = (ref.current as HTMLDivElement).getBoundingClientRect();
          const canvasRect = (ref.current as HTMLDivElement).closest('[data-canvas]')?.getBoundingClientRect();
          
          // Calculate new position
          const x = (e.clientX - canvasRect.left) / scale;
          const y = (e.clientY - canvasRect.top) / scale;
          
          // Add offset
          const offsetX = rect.width / 2;
          const offsetY = 20; // From the top of the element
          
          updateNodePosition(broker.id, { x: x - offsetX, y: y - offsetY });
        }
      }}
      onDragEnd={() => setDraggingNode(null)}
    >
      <div className={`flex items-center justify-between p-2 ${COLORS.broker.text}`}>
        <div className="flex items-center space-x-2">
          <GitBranch size={16} />
          <span className="font-medium text-sm">{broker.name}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        </div>
      </div>
      
      <div className="p-2 text-xs border-t border-amber-200 dark:border-amber-800">
        <div className="flex justify-between">
          <span>Value:</span> 
          <span className="font-mono">{broker.mappedType || 'any'}</span>
        </div>
      </div>
    </div>
  );
});

export default BrokerNode;

