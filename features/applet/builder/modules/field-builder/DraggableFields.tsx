"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, GripVertical, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFieldsByBrokerMappings } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import {
    selectAppletBrokerMappings,
    selectAllNeededBrokers,
    selectAllUsedFieldsInApplet,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectContainersForApplet } from "@/lib/redux/app-builder/selectors/appletSelectors";
import { selectContainerById } from "@/lib/redux/app-builder/selectors/containerSelectors";

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
    const fieldsFromDatabase = useAppSelector((state) => selectFieldsByBrokerMappings(state, appletId));
    const brokerMappings = useAppSelector((state) => selectAppletBrokerMappings(state, appletId));
    const neededBrokers = useAppSelector((state) => selectAllNeededBrokers(state, appletId));
    const usedFieldIdsInApplet = useAppSelector((state) => selectAllUsedFieldsInApplet(state, appletId));

    // Get containers to check if fields exist
    const appletContainers = useAppSelector((state) => selectContainersForApplet(state, appletId));

    // Track which broker-field mappings have been used
    const [droppedMappingIds, setDroppedMappingIds] = useState<Set<string>>(new Set());
    const [draggedItem, setDraggedItem] = useState<string | null>(null);

    // Update dropped mappings when the set of used fieldsFromDatabase changes
    useEffect(() => {
        if (!brokerMappings) return;

        // Create a set of mappings that should be marked as dropped
        const newDroppedMappings = new Set<string>();

        // For each broker mapping, check if its field is in any container
        brokerMappings.forEach((mapping) => {
            if (usedFieldIdsInApplet.has(mapping.fieldId)) {
                // This mapping's field is in some container, mark it as dropped
                newDroppedMappings.add(`field:${mapping.fieldId}|broker:${mapping.brokerId}`);
            }
        });

        setDroppedMappingIds(newDroppedMappings);
    }, [usedFieldIdsInApplet, brokerMappings]);

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
                brokerId,
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

    // Check field status in containers
    // Check field status in containers (move this outside the component)
    const checkFieldContainerStatus = (fieldId: string, appletContainers: any[], databaseContainer: any | null) => {
        const result = {
            inAppletContainer: false,
            appletContainerId: null as string | null,
            databaseContainerExists: false,
            fieldInDatabaseContainer: false,
            status: "error" as "error" | "warning" | "ok",
        };

        // Step 1: Find the field in applet containers
        if (appletContainers && appletContainers.length > 0) {
            for (const container of appletContainers) {
                if (container.fields && container.fields.some((f) => f.id === fieldId)) {
                    result.inAppletContainer = true;
                    result.appletContainerId = container.id;
                    break;
                }
            }
        }

        // Step 2 & 3: Check database container
        if (result.appletContainerId && databaseContainer) {
            result.databaseContainerExists = true;

            // Check if the field exists in the database container
            if (databaseContainer.fields && databaseContainer.fields.some((f) => f.id === fieldId)) {
                result.fieldInDatabaseContainer = true;
            }
        }

        // Determine overall status
        if (!result.inAppletContainer) {
            result.status = "error"; // Field not in any applet container
        } else if (!result.databaseContainerExists) {
            result.status = "error"; // Container doesn't exist in database
        } else if (!result.fieldInDatabaseContainer) {
            result.status = "warning"; // Container exists but field is missing
        } else {
            result.status = "ok"; // Everything is fine
        }

        return result;
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
                {fieldsFromDatabase.length === 0 || !brokerMappings || brokerMappings.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            No fieldsFromDatabase are currently mapped to brokers for this applet.
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Add broker mappings in the Fields & Brokers step to see fieldsFromDatabase here.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                        {brokerMappings.map((mapping) => {
                            // Added null checking for fieldsFromDatabase and field.id
                            const field = Array.isArray(fieldsFromDatabase)
                                ? fieldsFromDatabase.find((f) => f && f.id === mapping.fieldId)
                                : undefined;
                            const broker = Array.isArray(neededBrokers)
                                ? neededBrokers.find((b) => b && b.id === mapping.brokerId)
                                : undefined;

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

                            // Check field status
                            // Inside the map function, after getting field and broker:
                            // Get the container ID from applet containers
                            let containerId: string | null = null;
                            if (appletContainers) {
                                for (const container of appletContainers) {
                                    if (container.fields && container.fields.some((f) => f.id === mapping.fieldId)) {
                                        containerId = container.id;
                                        break;
                                    }
                                }
                            }

                            // Get the database container if we found a container ID
                            const databaseContainer = useAppSelector((state) =>
                                containerId ? selectContainerById(state, containerId) : null
                            );

                            // Check field status
                            const containerStatus = checkFieldContainerStatus(mapping.fieldId, appletContainers, databaseContainer);
                            // If there's any issue, don't disable the field
                            const hasIssue = containerStatus.status !== "ok";

                            return (
                                <div
                                    key={mappingId}
                                    draggable={!isDropped && !hasIssue} // Enable dragging if there's an issue
                                    onDragStart={(e) => !isDropped && !hasIssue && handleDragStart(e, mapping.fieldId, mapping.brokerId)}
                                    onDragEnd={handleDragEnd}
                                    className={`
                                            bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                                            rounded-md p-2 flex items-center
                                            ${
                                                isDropped && !hasIssue
                                                    ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800 pointer-events-none"
                                                    : "cursor-move hover:border-indigo-300 dark:hover:border-indigo-500"
                                            }
                                            ${isDragging ? "opacity-50 border-indigo-500" : ""}
                                            ${hasIssue ? "border-amber-400 dark:border-amber-600" : ""}
                                            transition-colors duration-150
                                        `}
                                >
                                    {!isDropped && !hasIssue && <GripVertical className="h-4 w-4 mr-2 flex-shrink-0 text-gray-400" />}
                                    {isDropped && !hasIssue && (
                                        <div className="h-4 w-4 mr-2 flex-shrink-0 text-green-500 dark:text-green-400 text-xs font-bold">
                                            ✓
                                        </div>
                                    )}
                                    {hasIssue && (
                                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 text-amber-500 dark:text-amber-400" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                            {field.label || `Field ${field.id}`}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Broker: {broker.name}</p>

                                        {/* Status indicators that ALWAYS show */}
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-gray-600 dark:text-gray-400">Container:</span>
                                                {containerStatus.databaseContainerExists ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs text-gray-600 dark:text-gray-400">Field:</span>
                                                {containerStatus.fieldInDatabaseContainer ? (
                                                    <CheckCircle2 className="h-3 w-3 text-green-500 dark:text-green-400" />
                                                ) : (
                                                    <XCircle className="h-3 w-3 text-red-500 dark:text-red-400" />
                                                )}
                                            </div>
                                        </div>

                                        {/* Show specific issue */}
                                        {!containerStatus.inAppletContainer && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Field not in applet</p>
                                        )}
                                        {containerStatus.inAppletContainer && !containerStatus.databaseContainerExists && (
                                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">Container missing from database</p>
                                        )}
                                        {containerStatus.databaseContainerExists && !containerStatus.fieldInDatabaseContainer && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Field missing from container</p>
                                        )}
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
