import React, { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComponentProps {
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  minDate?: string;
  maxDate?: string;
  onLabel?: string;
  offLabel?: string;
  multiSelect?: boolean;
  maxItems?: number;
  minItems?: number;
  gridCols?: string;
  autoComplete?: string;
  direction?: "vertical" | "horizontal";
  customContent?: React.ReactNode;
  showSelectAll?: boolean;
  width?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxLength?: number;
  spellCheck?: boolean;
}

interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  group?: string;
  iconName?: string;
  component: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: any[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

// Item type for sortable items
interface SortableItem {
  id: string;
  label: string;
  description?: string;
  order: number;
}

const SortableField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    options = [],
    componentProps = {},
    disabled = false
  } = field;
  
  const { 
    width, 
    customContent
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  // Track drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [items, setItems] = useState<SortableItem[]>([]);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<number | null>(null);
  
  // Reference to measure items
  const itemsRef = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Initialize items from options or state
  useEffect(() => {
    if (stateValue) {
      // If state exists, use it
      setItems(stateValue);
    } else if (options.length > 0) {
      // Initialize from options
      const initialItems = options.map((option, index) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        order: index
      }));
      
      setItems(initialItems);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: initialItems,
        })
      );
    }
  }, [options, stateValue, dispatch, id]);
  
  // Handler for starting drag
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
    if (disabled) return;
    
    setDraggedItemId(itemId);
    
    // Set drag data for cross-browser compatibility
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
    
    // Set ghost image (optional custom ghost)
    if (itemsRef.current[itemId]) {
      const rect = itemsRef.current[itemId]!.getBoundingClientRect();
      const ghostImg = new Image();
      ghostImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='0' height='0'%3E%3C/svg%3E";
      e.dataTransfer.setDragImage(ghostImg, 0, 0);
    }
    
    // Mark the current item as dragging
    const draggedItemIndex = items.findIndex(item => item.id === itemId);
    setGhostPosition(draggedItemIndex);
  };
  
  // Handler for drag end
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedItemId(null);
    setDropTargetId(null);
    setGhostPosition(null);
  };
  
  // Handler for drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetItemId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedItemId === null || draggedItemId === targetItemId || disabled) {
      return;
    }
    
    setDropTargetId(targetItemId);
    
    // Calculate and update ghost position
    const targetIndex = items.findIndex(item => item.id === targetItemId);
    setGhostPosition(targetIndex);
    
    // Get positions to determine if hovering on top or bottom half
    if (itemsRef.current[targetItemId]) {
      const rect = itemsRef.current[targetItemId]!.getBoundingClientRect();
      const mouseY = e.clientY;
      const threshold = rect.top + rect.height / 2;
      
      // If mouse is in the bottom half of the target, place after
      if (mouseY > threshold) {
        setGhostPosition(targetIndex + 0.5);
      } else {
        setGhostPosition(targetIndex - 0.5);
      }
    }
  };
  
  // Handler for drag leave
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear target if we're leaving the container
    const relatedTarget = e.relatedTarget as Element;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDropTargetId(null);
    }
  };
  
  // Handler for drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetItemId: string) => {
    e.preventDefault();
    
    if (draggedItemId === null || draggedItemId === targetItemId || disabled) {
      setDropTargetId(null);
      setGhostPosition(null);
      return;
    }
    
    // Reorder the items
    const updatedItems = [...items];
    
    const draggedItemIndex = updatedItems.findIndex(item => item.id === draggedItemId);
    const targetItemIndex = updatedItems.findIndex(item => item.id === targetItemId);
    
    if (draggedItemIndex !== -1 && targetItemIndex !== -1) {
      // Get positions to determine if dropping before or after
      let newPosition = targetItemIndex;
      
      if (itemsRef.current[targetItemId]) {
        const rect = itemsRef.current[targetItemId]!.getBoundingClientRect();
        const mouseY = e.clientY;
        const threshold = rect.top + rect.height / 2;
        
        // If mouse is in the bottom half of the target, place after
        if (mouseY > threshold) {
          if (draggedItemIndex < targetItemIndex) {
            newPosition = targetItemIndex;
          } else {
            newPosition = targetItemIndex + 1;
          }
        } else {
          if (draggedItemIndex < targetItemIndex) {
            newPosition = targetItemIndex - 1;
          } else {
            newPosition = targetItemIndex;
          }
        }
      }
      
      // Move the dragged item to the new position
      const [draggedItem] = updatedItems.splice(draggedItemIndex, 1);
      updatedItems.splice(newPosition, 0, draggedItem);
      
      // Update the order property
      const reorderedItems = updatedItems.map((item, index) => ({
        ...item,
        order: index
      }));
      
      setItems(reorderedItems);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: reorderedItems,
        })
      );
    }
    
    setDropTargetId(null);
    setGhostPosition(null);
  };
  
  // Handler for container drag over (for empty areas)
  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (draggedItemId === null || disabled) {
      return;
    }
    
    // Check if we're at the end of the list
    const containerRect = e.currentTarget.getBoundingClientRect();
    const containerBottom = containerRect.bottom - 20; // Buffer
    
    if (e.clientY > containerBottom) {
      setGhostPosition(items.length - 0.5);
    }
  };
  
  // Handler for container drop (for empty areas or end of list)
  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (draggedItemId === null || disabled) {
      setDropTargetId(null);
      setGhostPosition(null);
      return;
    }
    
    // Check if we should move to the end
    const containerRect = e.currentTarget.getBoundingClientRect();
    const containerBottom = containerRect.bottom - 20; // Buffer
    
    if (e.clientY > containerBottom) {
      // Move to end
      const updatedItems = [...items];
      const draggedItemIndex = updatedItems.findIndex(item => item.id === draggedItemId);
      
      if (draggedItemIndex !== -1) {
        const [draggedItem] = updatedItems.splice(draggedItemIndex, 1);
        updatedItems.push(draggedItem);
        
        // Update the order property
        const reorderedItems = updatedItems.map((item, index) => ({
          ...item,
          order: index
        }));
        
        setItems(reorderedItems);
        
        // Update state
        dispatch(
          updateBrokerValue({
            source: "applet",
            itemId: id,
            value: reorderedItems,
          })
        );
      }
    }
    
    setDropTargetId(null);
    setGhostPosition(null);
  };
  
  // Handler for moving item up
  const handleMoveUp = (itemId: string) => {
    if (disabled) return;
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex > 0) {
      const updatedItems = [...items];
      const temp = updatedItems[itemIndex];
      updatedItems[itemIndex] = updatedItems[itemIndex - 1];
      updatedItems[itemIndex - 1] = temp;
      
      // Update the order property
      const reorderedItems = updatedItems.map((item, index) => ({
        ...item,
        order: index
      }));
      
      setItems(reorderedItems);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: reorderedItems,
        })
      );
    }
  };
  
  // Handler for moving item down
  const handleMoveDown = (itemId: string) => {
    if (disabled) return;
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    
    if (itemIndex < items.length - 1) {
      const updatedItems = [...items];
      const temp = updatedItems[itemIndex];
      updatedItems[itemIndex] = updatedItems[itemIndex + 1];
      updatedItems[itemIndex + 1] = temp;
      
      // Update the order property
      const reorderedItems = updatedItems.map((item, index) => ({
        ...item,
        order: index
      }));
      
      setItems(reorderedItems);
      
      // Update state
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: reorderedItems,
        })
      );
    }
  };
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  // Sort items by order
  const sortedItems = [...items].sort((a, b) => a.order - b.order);
  
  // Determine if an item should shift up or down based on ghost position
  const getItemTransform = (index: number) => {
    if (ghostPosition === null || draggedItemId === null) return '';
    
    const draggedIndex = sortedItems.findIndex(item => item.id === draggedItemId);
    
    // If ghost is between items (has .5 in position)
    if (ghostPosition % 1 !== 0) {
      const beforePosition = Math.floor(ghostPosition);
      const afterPosition = Math.ceil(ghostPosition);
      
      // Item needs to shift if it's between the dragged item and the ghost
      if (draggedIndex < beforePosition && index >= draggedIndex && index <= beforePosition) {
        return 'transform -translate-y-10 transition-transform';
      } else if (draggedIndex > afterPosition && index <= draggedIndex && index >= afterPosition) {
        return 'transform translate-y-10 transition-transform';
      }
    }
    
    return '';
  };
  
  return (
    <div className={`${safeWidthClass}`}>
      <div 
        className={cn(
          "w-full border border-gray-300 dark:border-gray-700 rounded-md overflow-hidden relative",
          disabled && "opacity-60 pointer-events-none"
        )}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        {sortedItems.map((item, index) => {
          const isDragging = draggedItemId === item.id;
          const isDropTarget = dropTargetId === item.id;
          const transformClass = getItemTransform(index);
          
          return (
            <React.Fragment key={item.id}>
              {/* Ghost placeholder - shows before the item */}
              {!isDragging && ghostPosition !== null && 
                Math.floor(ghostPosition) === index && 
                ghostPosition < index && (
                <div className="h-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-md m-2 transition-all"></div>
              )}
              
              {/* The actual item */}
              <div
                ref={el => {
                  itemsRef.current[item.id] = el;
                }}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                className={cn(
                  "flex items-center p-3 bg-white dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700",
                  "transition-all duration-200",
                  index === sortedItems.length - 1 && "border-b-0",
                  isDragging && "opacity-50 bg-gray-50 dark:bg-gray-750",
                  isDropTarget && "bg-blue-50 dark:bg-blue-900/20",
                  transformClass,
                  "group"
                )}
              >
                {/* Drag handle */}
                <div 
                  className="mr-3 cursor-grab touch-none"
                  onMouseDown={(e) => e.preventDefault()} // Prevent text selection
                >
                  <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                
                {/* Item content */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </div>
                  )}
                </div>
                
                {/* Up/down buttons */}
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(item.id)}
                    disabled={index === 0 || disabled}
                    aria-label="Move up"
                    className={cn(
                      "p-1 rounded-full text-gray-500 dark:text-gray-400",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      "focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600",
                      "transition-opacity opacity-0 group-hover:opacity-100",
                      (index === 0 || disabled) && "cursor-not-allowed opacity-30"
                    )}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(item.id)}
                    disabled={index === sortedItems.length - 1 || disabled}
                    aria-label="Move down"
                    className={cn(
                      "p-1 rounded-full text-gray-500 dark:text-gray-400",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      "focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600",
                      "transition-opacity opacity-0 group-hover:opacity-100",
                      (index === sortedItems.length - 1 || disabled) && "cursor-not-allowed opacity-30"
                    )}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Ghost placeholder - shows after the item */}
              {!isDragging && ghostPosition !== null && 
                Math.ceil(ghostPosition) === index && 
                ghostPosition > index && (
                <div className="h-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-md m-2 transition-all"></div>
              )}
            </React.Fragment>
          );
        })}
        
        {/* Final ghost placeholder for the end of the list */}
        {ghostPosition !== null && ghostPosition > sortedItems.length - 1 && (
          <div className="h-10 bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-200 dark:border-blue-700 rounded-md m-2 transition-all"></div>
        )}
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Drag and drop items to reorder, or use the up and down arrows.
      </div>
    </div>
  );
};

export default SortableField;