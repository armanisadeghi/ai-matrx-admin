"use client";
import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect, useCallback, useId } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  useAnimationControls,
  PanInfo,
} from "motion/react";
import { useDraggableCard } from "./draggable-card-context";

interface EnhancedDraggableCardBodyProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  initialPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  snapPoints?: { x: number; y: number }[];
  group?: string;
  containerId?: string | null;
}

export const EnhancedDraggableCardBody = ({
  className,
  children,
  id: providedId,
  initialPosition,
  onPositionChange,
  snapPoints,
  group,
  containerId: initialContainerId,
}: EnhancedDraggableCardBodyProps) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const { 
    registerCard, 
    unregisterCard, 
    updatePosition, 
    assignToContainer,
    checkContainerIntersection
  } = useDraggableCard();
  
  // Track the draggable area container
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Motion values for interactive effects
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Position motion values
  const x = useMotionValue(initialPosition?.x || 0);
  const y = useMotionValue(initialPosition?.y || 0);
  
  const controls = useAnimationControls();
  const [lastValidPos, setLastValidPos] = useState({ x: initialPosition?.x || 0, y: initialPosition?.y || 0 });
  const [currentContainerId, setCurrentContainerId] = useState<string | null>(initialContainerId || null);

  // Register this card with the context
  useEffect(() => {
    registerCard(id, { 
      x: initialPosition?.x || 0, 
      y: initialPosition?.y || 0,
      group,
      containerId: initialContainerId
    });
    
    // Initialize the position motion values
    x.set(initialPosition?.x || 0);
    y.set(initialPosition?.y || 0);
    setLastValidPos({ x: initialPosition?.x || 0, y: initialPosition?.y || 0 });
    
    return () => {
      unregisterCard(id);
    };
  }, [id, registerCard, unregisterCard, initialPosition?.x, initialPosition?.y, group, initialContainerId, x, y]);

  // Update container assignment when currentContainerId changes
  useEffect(() => {
    assignToContainer(id, currentContainerId);
  }, [id, assignToContainer, currentContainerId]);

  // Spring config for animations
  const springConfig = {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  };

  // Visual effects based on mouse position
  const rotateX = useSpring(
    useTransform(mouseY, [-300, 300], [10, -10]), // Reduced rotation angle for stability
    springConfig,
  );
  
  const rotateY = useSpring(
    useTransform(mouseX, [-300, 300], [-10, 10]), // Reduced rotation angle for stability
    springConfig,
  );

  const opacity = useSpring(
    useTransform(mouseX, [-300, 0, 300], [0.9, 1, 0.9]), // Reduced opacity change for stability
    springConfig,
  );

  const glareOpacity = useSpring(
    useTransform(mouseX, [-300, 0, 300], [0.1, 0, 0.1]), // Reduced glare effect for stability
    springConfig,
  );

  // Handle mouse movement over the card for visual effects
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const { clientX, clientY } = e;
    const { width, height, left, top } = cardRef.current.getBoundingClientRect();
    
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    
    // Calculate delta from center of card
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    // Set mouse position values (used for effects, not positioning)
    mouseX.set(deltaX);
    mouseY.set(deltaY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Handle drag start
  const handleDragStart = useCallback(() => {
    document.body.style.cursor = "grabbing";
    
    // Store the current position as the last valid position
    setLastValidPos({
      x: x.get(),
      y: y.get()
    });
  }, [x, y]);

  // Handle drag motion
  const handleDrag = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Let Framer Motion handle the drag positioning naturally
    
    // Get current position from motion values
    const newX = x.get();
    const newY = y.get();
    
    // Update context and callback
    updatePosition(id, { x: newX, y: newY });
    
    if (onPositionChange) {
      onPositionChange({ x: newX, y: newY });
    }
    
    // Update the last valid position
    setLastValidPos({ x: newX, y: newY });
  }, [id, onPositionChange, updatePosition, x, y]);

  // Handle drag end
  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    document.body.style.cursor = "default";
    
    // Reset rotation
    controls.start({
      rotateX: 0,
      rotateY: 0,
      transition: {
        type: "spring",
        ...springConfig,
      },
    });
    
    // Get current position and dimensions
    const currentX = x.get();
    const currentY = y.get();
    let cardWidth = 320;
    let cardHeight = 320;
    
    // Get actual card dimensions if possible
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      cardWidth = rect.width;
      cardHeight = rect.height;
    }
    
    // Check if the card is inside any container
    const intersectingContainerId = checkContainerIntersection(id, {
      x: currentX,
      y: currentY,
      width: cardWidth,
      height: cardHeight
    });
    
    // Update the container assignment
    setCurrentContainerId(intersectingContainerId);
    
    // If inside a container, snap to it (center of container)
    if (intersectingContainerId) {
      // A container-specific snap will be handled by the demo page
      return;
    }
    
    // Otherwise, use regular snap points if enabled
    if (snapPoints && snapPoints.length > 0) {
      // Find the closest snap point
      let closestPoint = { x: currentX, y: currentY };
      let minDistance = Number.MAX_VALUE;
      
      snapPoints.forEach(point => {
        const distance = Math.sqrt(
          Math.pow(currentX - point.x, 2) + 
          Math.pow(currentY - point.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = point;
        }
      });
      
      // Snap to closest point if within threshold (50px)
      if (minDistance <= 50) {
        animate(x, closestPoint.x, {
          type: "spring",
          stiffness: 300,
          damping: 25,
          onUpdate: (latest) => {
            updatePosition(id, { x: latest, y: y.get() });
            if (onPositionChange) {
              onPositionChange({ x: latest, y: y.get() });
            }
          },
        });
        
        animate(y, closestPoint.y, {
          type: "spring",
          stiffness: 300,
          damping: 25,
          onUpdate: (latest) => {
            updatePosition(id, { x: x.get(), y: latest });
            if (onPositionChange) {
              onPositionChange({ x: x.get(), y: latest });
            }
          },
        });
        
        return;
      }
    }
    
    // Use very small velocity values for gentle movement after drag
    const dragVelocityX = info.velocity.x * 0.05;
    const dragVelocityY = info.velocity.y * 0.05;
    
    // Apply gentle physics deceleration
    animate(x, currentX + dragVelocityX, {
      type: "spring",
      stiffness: 300,
      damping: 25,
      onUpdate: (latest) => {
        if (isNaN(latest) || !isFinite(latest)) {
          // Fallback to last valid position if calculation went wrong
          x.set(lastValidPos.x);
          updatePosition(id, { x: lastValidPos.x, y: y.get() });
          if (onPositionChange) {
            onPositionChange({ x: lastValidPos.x, y: y.get() });
          }
          return;
        }
        
        updatePosition(id, { x: latest, y: y.get() });
        if (onPositionChange) {
          onPositionChange({ x: latest, y: y.get() });
        }
      },
    });
    
    animate(y, currentY + dragVelocityY, {
      type: "spring",
      stiffness: 300,
      damping: 25,
      onUpdate: (latest) => {
        if (isNaN(latest) || !isFinite(latest)) {
          // Fallback to last valid position if calculation went wrong
          y.set(lastValidPos.y);
          updatePosition(id, { x: x.get(), y: lastValidPos.y });
          if (onPositionChange) {
            onPositionChange({ x: x.get(), y: lastValidPos.y });
          }
          return;
        }
        
        updatePosition(id, { x: x.get(), y: latest });
        if (onPositionChange) {
          onPositionChange({ x: x.get(), y: latest });
        }
      },
    });
  }, [controls, id, lastValidPos.x, lastValidPos.y, onPositionChange, snapPoints, springConfig, updatePosition, x, y, checkContainerIntersection]);

  return (
    <div ref={containerRef} className={cn("[perspective:3000px]", className)}>
      <motion.div
        ref={cardRef}
        drag
        dragPropagation={false}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{
          x,
          y,
          rotateX,
          rotateY,
          opacity,
          willChange: "transform",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        animate={controls}
        whileHover={{ scale: 1.02 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative min-h-96 w-80 overflow-hidden rounded-md bg-neutral-100 p-6 shadow-2xl transform-3d dark:bg-neutral-900",
          currentContainerId ? "ring-2 ring-blue-500" : "",
          className,
        )}
      >
        {children}
        <motion.div
          style={{
            opacity: glareOpacity,
          }}
          className="pointer-events-none absolute inset-0 bg-white select-none"
        />
      </motion.div>
    </div>
  );
};

export const EnhancedDraggableCardContainer = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className={cn("relative", className)}>{children}</div>
  );
};

// Create a container that cards can be dropped into
export interface DropContainerProps {
  id: string;
  label: string;
  className?: string;
  children?: React.ReactNode;
  onCardAssigned?: (cardId: string) => void;
}

export const DropContainer = ({ 
  id, 
  label,
  className, 
  children,
  onCardAssigned
}: DropContainerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerContainer, unregisterContainer, updateContainerBounds } = useDraggableCard();
  
  // Register container and update bounds when mounted or resized
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const bounds = {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom
        };
        
        registerContainer(id, label, bounds);
        updateContainerBounds(id, bounds);
      }
    };
    
    // Initial registration
    updateBounds();
    
    // Update on resize
    window.addEventListener('resize', updateBounds);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateBounds);
      unregisterContainer(id);
    };
  }, [id, label, registerContainer, unregisterContainer, updateContainerBounds]);
  
  return (
    <div 
      ref={containerRef} 
      className={cn(
        "border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 min-h-[400px] bg-gray-50 dark:bg-gray-800/50",
        className
      )}
    >
      <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</div>
      {children}
    </div>
  );
}; 