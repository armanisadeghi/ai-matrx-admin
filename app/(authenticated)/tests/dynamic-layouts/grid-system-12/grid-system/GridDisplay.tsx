'use client'

import React, {useState, useRef} from 'react';
import {Container, containerColors, GRID_CONFIG, GRID_DEFAULTS, GridContainer, GridItem} from './index';
import {
    getBoxNumber,
    getMergedArea,
    getRectangleBoxes,
    getGridArea
} from './gridHelpers';
import {GridToolbar} from './GridToolbar';
import {useGridDimensions} from './hooks/useGridDimensions';
import {
    useContainerValidation
} from "@/app/(authenticated)/tests/dynamic-layouts/grid-system-12/grid-system/hooks/useContainerValidation";

interface GridSettings {
    gap: number;
}


export const GridDisplay: React.FC = () => {
    // Refs
    const containerRef = useRef<HTMLDivElement>(null);

    // State
    const [containers, setContainers] = useState<Container[]>([]);
    const [activeContainer, setActiveContainer] = useState<string | null>(null);
    const [newContainerName, setNewContainerName] = useState('');
    const [settings, setSettings] = useState<GridSettings>({gap: GRID_CONFIG.DEFAULT_GAP});

    // Custom Hooks
    const {dimensions} = useGridDimensions(containerRef);
    const {
        validationStatus,
        isContainerValid,
        getValidationMessage
    } = useContainerValidation(containers);

    // Container Management Handlers
    const handleBoxClick = (boxNumber: number) => {
        if (!activeContainer) return;

        setContainers(prevContainers => {
            return prevContainers.map(container => {
                if (container.id === activeContainer) {
                    const currentBoxes = container.boxes;
                    let newBoxes: number[];

                    if (currentBoxes.includes(boxNumber)) {
                        // Removing a box
                        newBoxes = currentBoxes.filter(b => b !== boxNumber);
                    } else {
                        // Adding a box - check if it would create a valid rectangle
                        newBoxes = [...currentBoxes, boxNumber].sort((a, b) => a - b);
                    }

                    return {
                        ...container,
                        boxes: newBoxes,
                        merged: false,
                        mergedArea: undefined
                    };
                }
                return container;
            });
        });
    };

    const handleMergeContainer = () => {
        if (!activeContainer || !isContainerValid(activeContainer)) return;

        setContainers(prevContainers => {
            return prevContainers.map(container => {
                if (container.id === activeContainer && container.boxes.length > 0) {
                    const mergedArea = getMergedArea(container.boxes);
                    const allBoxes = getRectangleBoxes(container.boxes);

                    return {
                        ...container,
                        boxes: allBoxes,
                        mergedArea,
                        merged: true
                    };
                }
                return container;
            });
        });

        setActiveContainer(null);
        const inputElement = document.querySelector('input[placeholder="New Container Name"]');
        if (inputElement instanceof HTMLInputElement) {
            inputElement.focus();
        }
    };

    const handleCreateContainer = () => {
        if (newContainerName.trim()) {
            const newContainer: Container = {
                id: Date.now().toString(),
                name: newContainerName.trim(),
                boxes: [],
                colorIndex: containers.length % containerColors.length,
                merged: GRID_DEFAULTS.MERGED_STATUS,
            };
            setContainers(prev => [...prev, newContainer]);
            setActiveContainer(newContainer.id);
            setNewContainerName('');
        }
    };

    const handleCreateContainerWithPlaceholder = () => {
        const newContainer: Container = {
            id: Date.now().toString(),
            name: `${GRID_CONFIG.DEFAULT_CONTAINER_NAME} ${containers.length + 1}`,
            boxes: [],
            colorIndex: containers.length % containerColors.length,
            merged: GRID_DEFAULTS.MERGED_STATUS,
        };
        setContainers(prev => [...prev, newContainer]);
        setActiveContainer(newContainer.id);
    };

    const handleRenameContainer = (containerId: string, newName: string) => {
        if (!newName.trim()) return;
        setContainers(prev => prev.map(container =>
            container.id === containerId
            ? {...container, name: newName.trim()}
            : container
        ));
    };

    const handleResetContainer = (containerId: string) => {
        setContainers(prev => prev.map(container =>
            container.id === containerId
            ? {
                    ...container,
                    boxes: [],
                    merged: GRID_DEFAULTS.MERGED_STATUS,
                    mergedArea: undefined
                }
            : container
        ));
    };

    const handleDeleteContainer = (containerId: string) => {
        setContainers(prev => prev.filter(container => container.id !== containerId));
        if (activeContainer === containerId) {
            setActiveContainer(null);
        }
    };

    const handleResetAll = () => {
        setContainers([]);
        setActiveContainer(null);
        setNewContainerName('');
        setSettings({gap: GRID_CONFIG.DEFAULT_GAP});
    };

    const handleGapChange = (value: number) => {
        setSettings(prev => ({
            ...prev,
            gap: Math.min(Math.max(value, GRID_CONFIG.MIN_GAP), GRID_CONFIG.MAX_GAP)
        }));
    };

    // Utility Functions
    const getBoxStyles = (boxNumber: number) => {
        const container = containers.find(c => c.boxes.includes(boxNumber));
        if (!container) return 'bg-card text-card-foreground hover:bg-primary/20';
        const colors = containerColors[container.colorIndex];
        return `${colors.bg} ${colors.text} hover:bg-primary/20`;
    };

    return (
        <div className="flex flex-col h-full w-full" ref={containerRef}>
            <GridToolbar
                containers={containers}
                activeContainer={activeContainer}
                newContainerName={newContainerName}
                settings={settings}
                validationStatus={validationStatus}
                containerColors={containerColors}
                onNewContainerNameChange={setNewContainerName}
                onCreateContainer={handleCreateContainer}
                onCreateContainerWithPlaceholder={handleCreateContainerWithPlaceholder}
                onRenameContainer={handleRenameContainer}
                onResetContainer={handleResetContainer}
                onDeleteContainer={handleDeleteContainer}
                onResetAll={handleResetAll}
                onContainerActivate={setActiveContainer}
                onMergeContainer={handleMergeContainer}
                onGapChange={handleGapChange}
            />

            <div className="flex-1 relative">
                <GridContainer
                    className="absolute inset-0"
                    style={{
                        gap: `${settings.gap}px`,
                    }}
                >
                    {Array.from({length: GRID_CONFIG.ROWS * GRID_CONFIG.COLUMNS}, (_, i) => i + 1)
                        .map((number) => {
                            const container = containers.find(c => c.boxes.includes(number));

                            if (container?.merged) {
                                const area = container.mergedArea!;
                                const startBox = getBoxNumber(area.rowStart - 1, area.colStart - 1);
                                if (number !== startBox) return null;
                            }

                            const gridArea = container?.merged
                                             ? container.mergedArea
                                             : getGridArea(number);

                            return (
                                <GridItem
                                    key={number}
                                    area={gridArea}
                                    className={`
                            ${getBoxStyles(number)}
                            ${activeContainer ? 'cursor-pointer' : ''}
                            transition-all
                            duration-200
                            flex
                            items-center
                            justify-center
                            text-xs
                            font-mono
                            border
                            border-border
                            rounded
                                                aspect-square
                            ${container?.merged ? 'z-10' : ''}
                            ${activeContainer ? 'hover:shadow-md hover:scale-105' : ''}
                        `}
                                    onClick={() => !container?.merged && handleBoxClick(number)}
                                >
                                    {container?.merged ? container.name : number}
                                </GridItem>
                            );
                        })}
                </GridContainer>
            </div>
        </div>
    );
};

export default GridDisplay;
