// 10. Connection Line Component
// src/components/workflow/ConnectionLine.jsx
import React from 'react';
import { useWorkflow } from './WorkflowContext';

const ConnectionLine = ({ connection, nodeRefs, canvasRef, scale, isDragging = false }) => {
  const { nodes, brokers } = useWorkflow();
  
  if (isDragging) {
    // Draw a line from source to mouse position
    // Implementation omitted for brevity
    return null;
  }

  const sourceNode = nodes.find(n => n.id === connection.sourceId) || 
                     brokers.find(b => b.id === connection.sourceId);
  const targetNode = nodes.find(n => n.id === connection.targetId) || 
                     brokers.find(b => b.id === connection.targetId);
                     
  if (!sourceNode || !targetNode || !nodeRefs.current[sourceNode.id] || !nodeRefs.current[targetNode.id]) {
    return null;
  }
  
  // Calculate connection points
  const sourceRect = nodeRefs.current[sourceNode.id].getBoundingClientRect();
  const targetRect = nodeRefs.current[targetNode.id].getBoundingClientRect();
  const canvasRect = canvasRef.current.getBoundingClientRect();
  
  // Output connector position (on the right side)
  const outputConnector = sourceNode.type === 'broker' 
    ? { x: sourceRect.right - canvasRect.left, y: sourceRect.top - canvasRect.top + 30 } 
    : { x: sourceRect.right - canvasRect.left, y: sourceRect.top - canvasRect.top + 40 };
    
  // Input connector position (on the left side)
  const inputConnector = targetNode.type === 'broker'
    ? { x: targetRect.left - canvasRect.left, y: targetRect.top - canvasRect.top + 30 }
    : { x: targetRect.left - canvasRect.left, y: targetRect.top - canvasRect.top + 40 };
   
  // Adjust for scaling
  const sourceX = outputConnector.x / scale;
  const sourceY = outputConnector.y / scale;
  const targetX = inputConnector.x / scale;
  const targetY = inputConnector.y / scale;
  
  // Bezier control points
  const controlPointX1 = sourceX + 50;
  const controlPointX2 = targetX - 50;
  
  const path = `M ${sourceX} ${sourceY} C ${controlPointX1} ${sourceY}, ${controlPointX2} ${targetY}, ${targetX} ${targetY}`;
  
  // Determine color based on connection type
  const connectionColor = sourceNode.type === 'broker' || targetNode.type === 'broker' 
    ? 'stroke-amber-400 dark:stroke-amber-500' 
    : 'stroke-indigo-400 dark:stroke-indigo-500';
  
  return (
    <path 
      d={path}
      className={`${connectionColor} fill-none transition-colors`}
      strokeWidth="2"
      markerEnd="url(#arrowhead)"
    />
  );
};

export default ConnectionLine;

