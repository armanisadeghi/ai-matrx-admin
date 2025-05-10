// File: features\applet\layouts\core\UniformHeightWrapper.tsx
'use client';


import React, { useRef, useEffect, useState } from "react";

interface UniformHeightWrapperProps {
  children: React.ReactNode;
  groupId: string;
  className?: string;
  layoutType: string;
  enabled?: boolean;
}

// Context to manage heights across components
export const UniformHeightContext = React.createContext<{
  registerHeight: (layoutType: string, groupId: string, height: number) => void;
  getMaxHeight: (layoutType: string) => number;
}>({
  registerHeight: () => {},
  getMaxHeight: () => 0,
});

// Provider component to wrap the entire layout
export const UniformHeightProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Store heights by layout type and group id
  const [heightMap, setHeightMap] = useState<Record<string, Record<string, number>>>({});
  
  // Calculate max height for a given layout type
  const getMaxHeight = (layoutType: string): number => {
    if (!heightMap[layoutType]) return 0;
    
    return Math.max(...Object.values(heightMap[layoutType]));
  };
  
  // Register a height for a specific group
  const registerHeight = (layoutType: string, groupId: string, height: number) => {
    setHeightMap(prev => {
      const layoutHeights = prev[layoutType] || {};
      
      // Only update if the height has changed
      if (layoutHeights[groupId] === height) {
        return prev;
      }
      
      return {
        ...prev,
        [layoutType]: {
          ...layoutHeights,
          [groupId]: height
        }
      };
    });
  };
  
  const contextValue = {
    registerHeight,
    getMaxHeight
  };
  
  return (
    <UniformHeightContext.Provider value={contextValue}>
      {children}
    </UniformHeightContext.Provider>
  );
};

// Wrapper component for individual search groups
const UniformHeightWrapper: React.FC<UniformHeightWrapperProps> = ({
  children,
  groupId,
  className = "",
  layoutType,
  enabled = true
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const { registerHeight, getMaxHeight } = React.useContext(UniformHeightContext);
  const [measured, setMeasured] = useState(false);
  
  // Measure the natural height of the content
  useEffect(() => {
    if (!contentRef.current || !enabled) return;
    
    // Use ResizeObserver to detect height changes
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        registerHeight(layoutType, groupId, height);
        setMeasured(true);
      }
    });
    
    resizeObserver.observe(contentRef.current);
    
    return () => {
      if (contentRef.current) {
        resizeObserver.unobserve(contentRef.current);
      }
    };
  }, [groupId, layoutType, registerHeight, enabled]);
  
  // For layouts that need uniform heights
  const maxHeight = enabled ? getMaxHeight(layoutType) : 0;
  
  return (
    <div 
      className={`${className} ${enabled && measured && maxHeight > 0 ? 'transition-all duration-300' : ''}`}
      style={{ 
        minHeight: enabled && measured && maxHeight > 0 ? `${maxHeight}px` : 'auto'
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export default UniformHeightWrapper;