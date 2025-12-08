'use client'
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  EnhancedDraggableCardBody,
  EnhancedDraggableCardContainer,
  DropContainer
} from "@/components/ui/enhanced-draggable-card";
import { DraggableCardProvider, useDraggableCard } from "@/components/ui/draggable-card-context";
import { ChevronDown, Info, AlertTriangle, BarChart3, Calendar, MessageSquare } from "lucide-react";
import { animate } from "motion/react";

// Card contents
const TaskCard = ({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-3 mb-3">
      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{title}</h3>
    </div>
    <p className="text-gray-600 dark:text-gray-400 flex-1">
      {description}
    </p>
    <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
      <div className="text-sm text-gray-500 dark:text-gray-400">Drag to organize</div>
      <div className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-300">Task</div>
    </div>
  </div>
);

// Container assignment display
const ContainerAssignmentDisplay = () => {
  const { positions, containers } = useDraggableCard();
  
  // Group cards by container
  const containerAssignments: Record<string, string[]> = {};
  
  // Initialize with empty arrays for all containers
  Object.keys(containers).forEach(containerId => {
    containerAssignments[containerId] = [];
  });
  
  // Add a category for unassigned cards
  containerAssignments['unassigned'] = [];
  
  // Assign cards to their containers
  Object.values(positions).forEach(position => {
    const containerId = position.containerId || 'unassigned';
    containerAssignments[containerId] = [
      ...(containerAssignments[containerId] || []),
      position.id
    ];
  });
  
  return (
    <div className="mt-8 p-4 bg-textured rounded-lg border-border">
      <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Container Assignments</h2>
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(containerAssignments).map(([containerId, cardIds]) => (
          <div key={containerId} className="p-3 bg-gray-100 dark:bg-gray-700 rounded">
            <div className="font-medium mb-1 text-gray-800 dark:text-gray-200">
              {containerId === 'unassigned' 
                ? 'Unassigned' 
                : containers[containerId]?.label || 'Unknown'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {cardIds.length === 0 
                ? 'No cards' 
                : cardIds.map(id => <div key={id}>{id}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Card position listener that handles container snapping
const CardPositionListener = ({ 
  cardId, 
  onContainerChange 
}: { 
  cardId: string; 
  onContainerChange?: (containerId: string | null) => void 
}) => {
  const { positions, containers, updatePosition } = useDraggableCard();
  const position = positions[cardId];
  const prevContainerIdRef = useRef<string | null>(null);
  // Reference to the draggable area
  const draggableAreaRef = useRef<HTMLDivElement | null>(null);

  // Find and store the draggable area on mount
  useEffect(() => {
    // Find the draggable area element (the parent div with class 'relative bg-gray-100')
    draggableAreaRef.current = document.querySelector('.relative.bg-gray-100.dark\\:bg-gray-800') as HTMLDivElement;
  }, []);

  // Watch for changes in containerId and snap to container center
  useEffect(() => {
    if (!position || !draggableAreaRef.current) return;

    const containerId = position.containerId;
    
    // If container assignment changed, snap to container center
    if (containerId && containerId !== prevContainerIdRef.current) {
      const container = containers[containerId];
      
      if (container) {
        // Get the draggable area's position
        const draggableAreaRect = draggableAreaRef.current.getBoundingClientRect();
        
        // Get the card dimensions
        const cardWidth = 320;
        const cardHeight = 320;
        
        // Calculate the container's position relative to the draggable area
        const containerRelativeLeft = container.bounds.left - draggableAreaRect.left;
        const containerRelativeTop = container.bounds.top - draggableAreaRect.top;
        const containerWidth = container.bounds.right - container.bounds.left;
        const containerHeight = container.bounds.bottom - container.bounds.top;
        
        // Calculate the target position (center of container)
        const containerCenterX = containerRelativeLeft + (containerWidth / 2) - (cardWidth / 2);
        const containerCenterY = containerRelativeTop + (containerHeight / 2) - (cardHeight / 2);
        
        console.log('Snapping card to container center:', {
          cardId,
          containerId,
          draggableAreaRect,
          containerBounds: container.bounds,
          containerRelative: { x: containerRelativeLeft, y: containerRelativeTop },
          cardCurrentPos: { x: position.x, y: position.y },
          targetPos: { x: containerCenterX, y: containerCenterY }
        });
        
        // Animate to container center with physics
        animate(position.x, containerCenterX, {
          type: "spring",
          stiffness: 300,
          damping: 30,
          onUpdate: (latest) => {
            updatePosition(cardId, { x: latest });
          }
        });
        
        animate(position.y, containerCenterY, {
          type: "spring",
          stiffness: 300,
          damping: 30,
          onUpdate: (latest) => {
            updatePosition(cardId, { y: latest });
          }
        });
        
        if (onContainerChange) {
          onContainerChange(containerId);
        }
      }
    }
    
    prevContainerIdRef.current = containerId;
  }, [position?.containerId, cardId, containers, position, updatePosition, onContainerChange]);
  
  return null;
};

// Main demo component
export default function ContainerDropDemo() {
  // State to track container assignments
  const [containerAssignments, setContainerAssignments] = useState<Record<string, string | null>>({
    'task-planning': null,
    'task-research': null,
    'task-communication': null
  });
  
  // Handle container change
  const handleContainerChange = useCallback((cardId: string, containerId: string | null) => {
    setContainerAssignments(prev => ({
      ...prev,
      [cardId]: containerId
    }));
  }, []);
  
  return (
    <DraggableCardProvider>
      <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-8 overflow-hidden">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
          Container Drop Demo
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Drag cards around and drop them into containers. Cards will snap to the container they are dropped in.
        </p>
        
        {/* Card position listeners */}
        <CardPositionListener 
          cardId="task-planning" 
          onContainerChange={(containerId) => handleContainerChange('task-planning', containerId)}
        />
        <CardPositionListener 
          cardId="task-research" 
          onContainerChange={(containerId) => handleContainerChange('task-research', containerId)}
        />
        <CardPositionListener 
          cardId="task-communication" 
          onContainerChange={(containerId) => handleContainerChange('task-communication', containerId)}
        />
        
        {/* Free dragging area with cards */}
        <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg border-border p-4 min-h-[300px] mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Free Movement Area</h2>
          
          {/* Draggable cards */}
          <EnhancedDraggableCardContainer>
            <EnhancedDraggableCardBody
              id="task-planning"
              initialPosition={{ x: 40, y: 40 }}
            >
              <TaskCard 
                title="Planning" 
                description="Create project timeline and resource allocation plan for Q2 initiatives."
                icon={<Calendar className="h-5 w-5" />} 
              />
            </EnhancedDraggableCardBody>
          </EnhancedDraggableCardContainer>
          
          <EnhancedDraggableCardContainer>
            <EnhancedDraggableCardBody
              id="task-research"
              initialPosition={{ x: 380, y: 40 }}
            >
              <TaskCard 
                title="Research" 
                description="Analyze market data and competitor strategies to identify opportunities."
                icon={<BarChart3 className="h-5 w-5" />} 
              />
            </EnhancedDraggableCardBody>
          </EnhancedDraggableCardContainer>
          
          <EnhancedDraggableCardContainer>
            <EnhancedDraggableCardBody
              id="task-communication"
              initialPosition={{ x: 720, y: 40 }}
            >
              <TaskCard 
                title="Communication" 
                description="Prepare stakeholder presentations and team briefing documents."
                icon={<MessageSquare className="h-5 w-5" />} 
              />
            </EnhancedDraggableCardBody>
          </EnhancedDraggableCardContainer>
        </div>
        
        {/* Container grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <DropContainer id="container-backlog" label="Backlog">
            <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Drag tasks here to add them to the backlog</p>
            </div>
          </DropContainer>
          
          <DropContainer id="container-in-progress" label="In Progress">
            <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
              <ChevronDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Drop tasks here to mark them as in progress</p>
            </div>
          </DropContainer>
          
          <DropContainer id="container-completed" label="Completed">
            <div className="text-center text-gray-500 dark:text-gray-400 mt-12">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Move completed tasks here</p>
            </div>
          </DropContainer>
        </div>
        
        {/* Display container assignments */}
        <ContainerAssignmentDisplay />
      </div>
    </DraggableCardProvider>
  );
} 