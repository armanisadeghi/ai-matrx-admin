import React, { useEffect, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDefinition, FieldOption } from "@/types/customAppTypes";

interface SortableItem extends FieldOption {
    order: number;
}

const SortableField: React.FC<{
    field: FieldDefinition;
    appletId: string;
    isMobile?: boolean;
    source?: string;
    disabled?: boolean;
}> = ({ field, appletId, isMobile, source = "applet", disabled = false }) => {
    const { id, label, options, componentProps } = field;
    const { width, customContent } = componentProps;
    const safeWidthClass = ensureValidWidthClass(width);
    const dispatch = useAppDispatch();
    const stateValue = useAppSelector((state) => selectBrokerValue(state, source, id));

    // Track drag and drop state
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [items, setItems] = useState<SortableItem[]>([]);
    const [dropPosition, setDropPosition] = useState<number | null>(null);
    const [activeItemId, setActiveItemId] = useState<string | null>(null);

    // Reference to measure items
    const itemsRef = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Initialize items from options or state
    useEffect(() => {
        if (stateValue) {
            setItems(stateValue);
        } else if (options.length > 0) {
            const initialItems = options.map((option, index) => ({
                id: option.id,
                label: option.label,
                description: option.description,
                order: index,
            }));
            setItems(initialItems);
            dispatch(
                updateBrokerValue({
                    source: source,
                    itemId: id,
                    value: initialItems,
                })
            );
        }
    }, [options, stateValue, dispatch, id, source]);

    // Handler for starting drag
    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, itemId: string) => {
        if (disabled) return;
        setDraggedItemId(itemId);
        setActiveItemId(itemId);
        e.dataTransfer.effectAllowed = "move";
    };

    // Handler for drag end
    const handleDragEnd = () => {
        setDraggedItemId(null);
        setDropPosition(null);
    };

    // Handler for drag over
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        if (draggedItemId === null || disabled) {
            return;
        }

        const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
        if (draggedIndex === targetIndex) {
            setDropPosition(null);
            return;
        }

        const targetElement = itemsRef.current[items[targetIndex].id];
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const mouseY = e.clientY;
            const threshold = rect.top + rect.height / 2;

            if (mouseY < threshold) {
                setDropPosition(targetIndex);
            } else {
                setDropPosition(targetIndex + 1);
            }
        }
    };

    // Handler for drag over container
    const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        if (draggedItemId === null || disabled) return;

        // Check if we're at the bottom of the container
        const containerRect = e.currentTarget.getBoundingClientRect();
        const lastItem = itemsRef.current[items[items.length - 1]?.id];
        
        if (lastItem) {
            const lastItemRect = lastItem.getBoundingClientRect();
            if (e.clientY > lastItemRect.bottom) {
                setDropPosition(items.length);
            }
        }
    };

    // Handler for drop
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        if (draggedItemId === null || dropPosition === null || disabled) {
            setDropPosition(null);
            return;
        }

        const draggedIndex = items.findIndex((item) => item.id === draggedItemId);
        if (draggedIndex === -1) return;

        const updatedItems = [...items];
        const [draggedItem] = updatedItems.splice(draggedIndex, 1);
        
        let targetIndex = dropPosition;
        if (draggedIndex < dropPosition) {
            targetIndex -= 1;
        }
        
        updatedItems.splice(targetIndex, 0, draggedItem);

        const reorderedItems = updatedItems.map((item, index) => ({
            ...item,
            order: index,
        }));

        setItems(reorderedItems);
        dispatch(
            updateBrokerValue({
                source: source,
                itemId: id,
                value: reorderedItems,
            })
        );

        setDropPosition(null);
    };

    // Handler for moving item up
    const handleMoveUp = (itemId: string) => {
        if (disabled) return;
        setActiveItemId(itemId);
        
        const itemIndex = items.findIndex((item) => item.id === itemId);
        if (itemIndex > 0) {
            const updatedItems = [...items];
            [updatedItems[itemIndex - 1], updatedItems[itemIndex]] = 
            [updatedItems[itemIndex], updatedItems[itemIndex - 1]];

            const reorderedItems = updatedItems.map((item, index) => ({
                ...item,
                order: index,
            }));

            setItems(reorderedItems);
            dispatch(
                updateBrokerValue({
                    source: source,
                    itemId: id,
                    value: reorderedItems,
                })
            );
        }
    };

    // Handler for moving item down
    const handleMoveDown = (itemId: string) => {
        if (disabled) return;
        setActiveItemId(itemId);
        
        const itemIndex = items.findIndex((item) => item.id === itemId);
        if (itemIndex < items.length - 1) {
            const updatedItems = [...items];
            [updatedItems[itemIndex], updatedItems[itemIndex + 1]] = 
            [updatedItems[itemIndex + 1], updatedItems[itemIndex]];

            const reorderedItems = updatedItems.map((item, index) => ({
                ...item,
                order: index,
            }));

            setItems(reorderedItems);
            dispatch(
                updateBrokerValue({
                    source: source,
                    itemId: id,
                    value: reorderedItems,
                })
            );
        }
    };

    if (customContent) {
        return <>{customContent}</>;
    }

    const sortedItems = [...items].sort((a, b) => a.order - b.order);

    return (
        <div className={`${safeWidthClass}`}>
            <div
                className={cn(
                    "w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden relative bg-gray-50 dark:bg-gray-900/50",
                    disabled && "opacity-60 pointer-events-none"
                )}
                onDragOver={handleContainerDragOver}
                onDrop={handleDrop}
            >
                {sortedItems.map((item, index) => {
                    const isDragging = draggedItemId === item.id;
                    const isActive = activeItemId === item.id;
                    
                    return (
                        <React.Fragment key={item.id}>
                            {/* Ghost placeholder - shows where item will drop */}
                            {dropPosition === index && (
                                <div className="mx-2 my-2">
                                    <div className="h-16 bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-lg" />
                                </div>
                            )}
                            
                            {/* The actual item */}
                            <div
                                ref={(el) => {
                                    itemsRef.current[item.id] = el;
                                }}
                                draggable={!disabled}
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, index)}
                                className={cn(
                                    "relative flex items-center p-4 mx-2 my-2 bg-white dark:bg-gray-800 rounded-lg",
                                    "transition-opacity duration-200",
                                    "hover:shadow-md dark:hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50",
                                    isDragging && "opacity-30",
                                    isActive && "ring-2 ring-blue-500 dark:ring-blue-400",
                                    "group cursor-move"
                                )}
                            >
                                {/* Drag handle */}
                                <div className="mr-3 touch-none">
                                    <GripVertical className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                </div>
                                
                                {/* Item content */}
                                <div className="flex-1 min-w-0 select-none">
                                    <div
                                        className={cn(
                                            "text-sm font-medium",
                                            isActive ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-300"
                                        )}
                                    >
                                        {item.label}
                                    </div>
                                    {item.description && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                                            "p-1.5 rounded-lg text-gray-500 dark:text-gray-400",
                                            "hover:bg-gray-100 dark:hover:bg-gray-700",
                                            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                                            "transition-all duration-200",
                                            "opacity-0 group-hover:opacity-100 focus:opacity-100",
                                            (index === 0 || disabled) && "cursor-not-allowed",
                                            isActive && "opacity-100"
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
                                            "p-1.5 rounded-lg text-gray-500 dark:text-gray-400",
                                            "hover:bg-gray-100 dark:hover:bg-gray-700",
                                            "focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400",
                                            "transition-all duration-200",
                                            "opacity-0 group-hover:opacity-100 focus:opacity-100",
                                            (index === sortedItems.length - 1 || disabled) && "cursor-not-allowed",
                                            isActive && "opacity-100"
                                        )}
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
                
                {/* Final ghost placeholder for end of list */}
                {dropPosition === sortedItems.length && (
                    <div className="mx-2 my-2">
                        <div className="h-16 bg-blue-100 dark:bg-blue-900/30 border-2 border-dashed border-blue-400 dark:border-blue-600 rounded-lg" />
                    </div>
                )}
            </div>
            
            {/* Instructions */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Drag and drop items to reorder, or use the up and down arrows
            </div>
        </div>
    );
};

export default SortableField;