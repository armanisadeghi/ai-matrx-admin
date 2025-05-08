"use client";

import React, { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { addField, removeField } from "@/lib/redux/app-builder/slices/containerBuilderSlice";
import { selectAllFields } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { selectAllContainerIds, selectContainerById } from "@/lib/redux/app-builder/selectors/containerSelectors";
import { fetchContainerByIdThunk, setActiveContainerWithFetchThunk } from "@/lib/redux/app-builder/thunks/containerBuilderThunks";
import { toast } from "@/components/ui/use-toast";

interface ContainerCardProps {
    containerId: string;
    isActive: boolean;
    isCompiled: boolean;
    onSelect: (containerId: string) => void;
    onDelete: (containerId: string, event: React.MouseEvent) => void;
}

const ContainerCard: React.FC<ContainerCardProps> = ({ containerId, isActive, isCompiled, onSelect, onDelete }) => {
    const dispatch = useAppDispatch();
    const [isDragOver, setIsDragOver] = useState(false);
    const allFields = useAppSelector(selectAllFields);
    const allContainerIds = useAppSelector(selectAllContainerIds);
    const [fetchingContainer, setFetchingContainer] = useState(false);

    const handleContainerSelect = async (containerId: string) => {
        const containerExists = allContainerIds.includes(containerId);
        if (containerExists) {
            dispatch(setActiveContainerWithFetchThunk(containerId));
        } else {
            setFetchingContainer(true);
            try {
                await dispatch(fetchContainerByIdThunk(containerId)).unwrap();
                dispatch(setActiveContainerWithFetchThunk(containerId));

                toast({
                    title: "Success",
                    description: "Container loaded successfully.",
                });
            } catch (error) {
                toast({
                    title: "Error",
                    description: "Failed to load container from database.",
                    variant: "destructive",
                });
            } finally {
                setFetchingContainer(false);
            }
        }
    };

    useEffect(() => {
        const fetchContainer = async () => {
            await dispatch(setActiveContainerWithFetchThunk(containerId));
        };
        fetchContainer();
    }, [containerId, dispatch]);
    
    const container = useAppSelector(state => selectContainerById(state, containerId));

    const handleRemoveField = (fieldId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent container selection
        dispatch(removeField({ containerId: containerId, fieldId }));
    };

    // Drag handling events
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        
        try {
            const dataTransfer = e.dataTransfer.getData("application/json");
            const data = JSON.parse(dataTransfer);
            
            if (data.type === "broker-field") {
                const fieldId = data.fieldId;
                
                if (!fieldId) {
                    return;
                }
                
                const existingField = allFields.find(field => field.id === fieldId);
                
                if (existingField) {
                    dispatch(addField({ 
                        containerId: container.id, 
                        field: existingField 
                    }));
                }
            }
        } catch (error) {
            console.error("Error processing dropped field:", error);
        }
    };

    if (!container) {
        return (
            <div className="p-3 border rounded-lg cursor-pointer transition-all">
                <p className="text-gray-500 dark:text-gray-400">Container not found</p>
            </div>
        );
    }

    return (
        <div
            onClick={() => onSelect(container.id)}
            data-container-id={container.id}
            data-droppable="true"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                isActive
                    ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            } container-drop-target relative h-full flex flex-col`}
        >
            <div className="flex justify-between items-center">
                <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{container.label || "Unnamed Container"}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{container.shortLabel || "No short label"}</p>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 py-1 px-2 rounded-full">
                        {container.fields?.length || 0} field
                        {container.fields?.length !== 1 ? "s" : ""}
                    </span>
                    {isCompiled && (
                        <span className="ml-2 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 py-1 px-2 rounded-full">
                            Compiled Version
                        </span>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => onDelete(container.id, e)}
                        className="h-7 w-7 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            
            {/* Display fields that are in the container */}
            <div className="mt-3 grow overflow-hidden flex flex-col">
                {container.fields && container.fields.length > 0 ? (
                    <div className="space-y-2 overflow-y-auto max-h-[640px] pr-1">
                        {container.fields.map((field) => (
                            <div
                                key={field.id}
                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-2 flex items-center justify-between"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {field.label || `Field ${field.id}`}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        Component: {field.component || "Unknown"}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => handleRemoveField(field.id, e)}
                                    className="ml-2 h-6 w-6 rounded-full flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-32 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Drag fields here to add them to this container
                        </p>
                    </div>
                )}
            </div>

            {/* Visual indicator for drop area that will be styled with CSS */}
            <div 
                className={`absolute inset-0 pointer-events-none drop-indicator border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg transition-opacity ${
                    isDragOver ? 'opacity-100' : 'opacity-0'
                }`}
            ></div>
        </div>
    );
};

export default ContainerCard;
