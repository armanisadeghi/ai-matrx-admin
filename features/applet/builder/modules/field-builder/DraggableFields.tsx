"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, GripVertical, AlertTriangle } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFieldsByBrokerMappings } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { 
  selectAppletBrokerMappings, 
  selectAllNeededBrokers, 
  selectAllUsedFieldsInApplet
} from "@/lib/redux/app-builder/selectors/appletSelectors";

interface DraggableFieldsProps {
  appId: string;
  appletId: string;
  className?: string;
  onSuccessfulDrop?: (fieldId: string, brokerId: string, appletId: string) => void;
}

// ========== IMPORTANT TODO: This component needs to:
// - Show if a field is dirty
// - Compare the version of the field we have to the data in the container and applet and report that there is a difference.



const DraggableFields: React.FC<DraggableFieldsProps> = ({ appId, appletId, onSuccessfulDrop, className = "" }) => {
  const fields = useAppSelector((state) => selectFieldsByBrokerMappings(state, appletId));
  const brokerMappings = useAppSelector((state) => selectAppletBrokerMappings(state, appletId));
  const neededBrokers = useAppSelector((state) => selectAllNeededBrokers(state, appletId));
  
  const usedFieldIds = useAppSelector(state => 
    selectAllUsedFieldsInApplet(state, appletId)
  );
    
  // Track which broker-field mappings have been used
  const [droppedMappingIds, setDroppedMappingIds] = useState<Set<string>>(new Set());
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // Update dropped mappings when the set of used fields changes
  useEffect(() => {
    if (!brokerMappings) return;
    
    // Create a set of mappings that should be marked as dropped
    const newDroppedMappings = new Set<string>();
    
    // For each broker mapping, check if its field is in any container
    brokerMappings.forEach(mapping => {
      if (usedFieldIds.has(mapping.fieldId)) {
        // This mapping's field is in some container, mark it as dropped
        newDroppedMappings.add(`field:${mapping.fieldId}|broker:${mapping.brokerId}`);
      }
    });
    
    setDroppedMappingIds(newDroppedMappings);
  }, [usedFieldIds, brokerMappings]);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, fieldId: string, brokerId: string) => {
    // Create a mapping ID that clearly identifies both the field and broker
    const mappingId = `field:${fieldId}|broker:${brokerId}`;
    setDraggedItem(mappingId);
    
    // Set the drag data with field and broker information
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        mappingId,
        type: "broker-field",
        fieldId,
        brokerId
      })
    );
    e.dataTransfer.effectAllowed = "move";
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Handle successful drop (called by drop target)
  const handleDrop = (fieldId: string, brokerId: string) => {
    const mappingId = `field:${fieldId}|broker:${brokerId}`;
    setDroppedMappingIds((prev) => new Set(prev).add(mappingId));
    if (onSuccessfulDrop) {
      onSuccessfulDrop(fieldId, brokerId, appletId);
    }
  };

  return (
    <Card className={`border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm ${className}`}>
      <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 py-3 px-4">
        <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center">
          <Database className="h-4 w-4 mr-2 text-indigo-500" />
          Available Fields
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {fields.length === 0 || !brokerMappings || brokerMappings.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No fields are currently mapped to brokers for this applet.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Add broker mappings in the Fields & Brokers step to see fields here.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {brokerMappings.map((mapping) => {
              // Added null checking for fields and field.id
              const field = Array.isArray(fields) ? fields.find((f) => f && f.id === mapping.fieldId) : undefined;
              const broker = Array.isArray(neededBrokers) ? neededBrokers.find((b) => b && b.id === mapping.brokerId) : undefined;
              
              if (!field || !broker) {
                // Render an error indicator for missing field or broker
                return (
                  <div 
                    key={`error-mapping-${mapping.fieldId}-${mapping.brokerId}`}
                    className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                              rounded-md p-2 flex items-center"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300">
                        {!field ? "Missing Field Data" : "Missing Broker Data"}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Field ID: {mapping.fieldId}, Broker ID: {mapping.brokerId}
                      </p>
                    </div>
                  </div>
                );
              }

              // Use a clear delimiter format for mapping IDs
              const mappingId = `field:${mapping.fieldId}|broker:${mapping.brokerId}`;
              const isDropped = droppedMappingIds.has(mappingId);
              const isDragging = draggedItem === mappingId;

              return (
                <div
                  key={mappingId}
                  draggable={!isDropped} // Disable dragging if dropped
                  onDragStart={(e) => !isDropped && handleDragStart(e, mapping.fieldId, mapping.brokerId)}
                  onDragEnd={handleDragEnd}
                  className={`
                    bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                    rounded-md p-2 flex items-center
                    ${isDropped ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 pointer-events-none' : 'cursor-move hover:border-indigo-300 dark:hover:border-indigo-500'}
                    ${isDragging ? 'opacity-50 border-indigo-500' : ''}
                    transition-colors duration-150
                  `}
                >
                  {!isDropped && (
                    <GripVertical
                      className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400"
                    />
                  )}
                  {isDropped && (
                    <div className="h-4 w-4 mr-2 flex-shrink-0 text-green-500 dark:text-green-400 text-xs font-bold">✓</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                      {field.label || `Field ${field.id}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      Broker: {broker.name}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DraggableFields;