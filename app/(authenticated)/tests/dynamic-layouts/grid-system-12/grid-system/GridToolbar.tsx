// components/GridToolbar.tsx
import React, {useState} from 'react';
import {Button} from "@/components/ui/button"
import {Input} from "@/components/ui/input"
import {Slider} from "@/components/ui/slider"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {MoreVertical, Plus, Trash, RefreshCw} from 'lucide-react'
import {EnhancedJsonViewer} from '@/components/ui';
import {GRID_CONFIG} from './config';
import { GridSettings, Container } from './gridTypes';

// components/GridToolbar.tsx
interface GridToolbarProps {
    // State
    containers: Container[];
    activeContainer: string | null;
    newContainerName: string;
    settings: GridSettings;
    validationStatus: {
        [key: string]: {
            isValid: boolean;
            message?: string;
        }
    };
    containerColors: Array<{ bg: string; text: string }>;

    // Container Creation & Management
    onNewContainerNameChange: (name: string) => void;
    onCreateContainer: () => void;
    onCreateContainerWithPlaceholder: () => void;
    onRenameContainer: (containerId: string, newName: string) => void;
    onResetContainer: (containerId: string) => void;
    onDeleteContainer: (containerId: string) => void;
    onResetAll: () => void;

    // Container Interaction
    onContainerActivate: (id: string) => void;
    onMergeContainer: () => void;

    // Settings
    onGapChange: (value: number) => void;
}



export const GridToolbar: React.FC<GridToolbarProps> = (
    {
        containers,
        activeContainer,
        newContainerName,
        settings,
        validationStatus,
        containerColors,
        onNewContainerNameChange,
        onCreateContainer,
        onCreateContainerWithPlaceholder,
        onRenameContainer,
        onResetContainer,
        onDeleteContainer,
        onResetAll,
        onContainerActivate,
        onMergeContainer,
        onGapChange,
    }) => {
    const [renamingContainer, setRenamingContainer] = useState<string | null>(null);
    const [newName, setNewName] = useState('');

    return (
        <div className="flex items-center gap-2 p-2 bg-secondary/10">
            {/* Container Creation Section */}
            <div className="flex items-center gap-2">
                <Input
                    className="w-48"
                    placeholder="New Container Name"
                    value={newContainerName}
                    onChange={(e) => onNewContainerNameChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onCreateContainer()}
                />
                <Button
                    size="sm"
                    onClick={onCreateContainer}
                    disabled={!newContainerName.trim()}
                >
                    Create Container
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onCreateContainerWithPlaceholder}
                >
                    <Plus className="h-4 w-4 mr-1"/>
                    Quick Add
                </Button>
            </div>

            {/* Gap Control */}
            <div className="flex items-center gap-2">
                <span className="text-sm">Gap:</span>
                <Slider
                    className="w-24"
                    min={GRID_CONFIG.MIN_GAP}
                    max={GRID_CONFIG.MAX_GAP}
                    step={GRID_CONFIG.GAP_STEP}
                    value={[settings.gap]}
                    onValueChange={([value]) => onGapChange(value)}
                />
                <span className="text-sm w-8">{settings.gap}px</span>
            </div>

            {/* Container List */}
            <div className="flex items-center gap-2 flex-wrap">
                {containers.map((container) => (
                    <div key={container.id} className="relative flex items-center gap-1">
                        <Button
                            size="sm"
                            variant={activeContainer === container.id ? "default" : "outline"}
                            className={`
                            ${containerColors[container.colorIndex].bg} 
                            ${containerColors[container.colorIndex].text} 
                            text-xs
                    ${!validationStatus[container.id]?.isValid && container.boxes.length > 0
                      ? 'border-2 border-yellow-500'
                      : ''}
                        `}
                            onClick={() => onContainerActivate(container.id)}
                        >
                            {container.name} ({container.boxes.length})
                {!validationStatus[container.id]?.isValid && container.boxes.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full"/>
                            )}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4"/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                    setRenamingContainer(container.id);
                                    setNewName(container.name);
                                }}>
                                    Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onResetContainer(container.id)}>
                                    Reset
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => onDeleteContainer(container.id)}
                                >
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
                {activeContainer && (
                    <Button
                        size="sm"
                        onClick={onMergeContainer}
                        variant="outline"
                        disabled={!validationStatus[activeContainer]?.isValid}
                        className={!validationStatus[activeContainer]?.isValid ? 'opacity-50' : ''}
                    >
                        Merge Active
                    </Button>
                )}

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={onResetAll}
                >
                    <RefreshCw className="h-4 w-4 mr-1"/>
                    Reset All
                </Button>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline">View Data</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Container Data</DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <EnhancedJsonViewer data={{containers, settings}}/>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rename Dialog */}
            <Dialog open={!!renamingContainer} onOpenChange={() => setRenamingContainer(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Rename Container</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && newName.trim() && renamingContainer) {
                                    onRenameContainer(renamingContainer, newName);
                                    setRenamingContainer(null);
                                }
                            }}
                        />
                        <Button
                            onClick={() => {
                                if (newName.trim() && renamingContainer) {
                                    onRenameContainer(renamingContainer, newName);
                                    setRenamingContainer(null);
                                }
                            }}
                        >
                            Save
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
