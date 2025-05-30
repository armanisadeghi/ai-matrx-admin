"use client";
import { getSmoothStepPath, EdgeProps, BaseEdge, EdgeLabelRenderer } from 'reactflow';
import { useTheme } from "@/styles/themes/ThemeProvider";
import { useEffect, useState } from 'react';

export const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  label,
  interactionWidth = 20,
  selected,
}: EdgeProps) => {
  const { mode } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDarkMode = mode === 'dark';

  // Only after mounting, we can determine the theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Define colors based on theme and selection state
  const edgeColor = selected 
    ? '#3b82f6' 
    : isDarkMode 
      ? '#94a3b8' 
      : '#b1b1b7';
      
  const labelBgColor = selected 
    ? '#3b82f6' 
    : isDarkMode 
      ? 'rgba(30, 41, 59, 0.8)'  // dark background
      : 'rgba(255, 255, 255, 0.75)'; // light background
      
  const labelTextColor = selected 
    ? 'white' 
    : isDarkMode 
      ? '#e2e8f0'  // light text for dark mode
      : '#1e293b'; // dark text for light mode
      
  const labelBorderColor = isDarkMode 
    ? selected ? '#60a5fa' : '#475569'  // darker border for dark mode
    : selected ? '#93c5fd' : '#ccc';    // light border for light mode

  // Enhance the style when the edge is selected
  const edgeStyle = {
    ...style,
    stroke: edgeColor,
    strokeWidth: selected ? 3 : (style.strokeWidth as number || 2),
    ...(selected && {
      filter: 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'
    }),
  };

  // Only proceed with rendering if mounted
  if (!mounted) return null;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        interactionWidth={interactionWidth}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              fontWeight: selected ? 500 : 400,
              pointerEvents: 'all',
              backgroundColor: labelBgColor,
              padding: '3px 6px',
              borderRadius: 4,
              color: labelTextColor,
              border: `1px solid ${labelBorderColor}`,
              boxShadow: isDarkMode
                ? '0 2px 4px rgba(0, 0, 0, 0.3)'
                : '0 1px 2px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              maxWidth: '150px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            className={`nodrag nopan ${selected ? 'scale-105' : ''}`}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge; 