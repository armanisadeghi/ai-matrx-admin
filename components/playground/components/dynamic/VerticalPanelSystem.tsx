import React, { useCallback, useRef, useState } from 'react';
import { Group, Panel, Separator, GroupImperativeHandle, PanelImperativeHandle } from 'react-resizable-panels';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PanelData {
    id: string;
    content: any;
    order: number;
}

interface ResizablePanelSystemProps {
    // Core props
    panels: PanelData[];
    renderPanel: (panel: PanelData, isCollapsed: boolean) => React.ReactNode;

    // Panel management
    onPanelAdd?: () => void;
    onPanelDelete?: (id: string) => void;
    onPanelReorder?: (fromId: string, toId: string) => void;

    // Customization
    addButtonLabel?: string;
    showAddButton?: boolean;
    className?: string;
}

export const ResizablePanelSystem: React.FC<ResizablePanelSystemProps> = ({
    panels,
    renderPanel,
    onPanelAdd,
    onPanelDelete,
    onPanelReorder,
    addButtonLabel = 'Add Panel',
    showAddButton = true,
    className = '',
}) => {
    const panelGroupRef = useRef<GroupImperativeHandle>(null);
    const panelRefs = useRef<Map<string, PanelImperativeHandle>>(new Map());
    const [collapsedPanels, setCollapsedPanels] = useState<Set<string>>(new Set());

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [activePanelId, setActivePanelId] = useState<string | null>(null);

    const registerPanelRef = (panelId: string, ref: PanelImperativeHandle | null) => {
        if (ref) {
            panelRefs.current.set(panelId, ref);
        } else {
            panelRefs.current.delete(panelId);
        }
    };

    const handlePanelCollapse = useCallback((panelId: string) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.add(panelId);
            return newSet;
        });
    }, []);

    const handlePanelExpand = useCallback((panelId: string) => {
        setCollapsedPanels((prev) => {
            const newSet = new Set(prev);
            newSet.delete(panelId);
            return newSet;
        });
    }, []);

    const togglePanel = useCallback(
        (panelId: string) => {
            const panelRef = panelRefs.current.get(panelId);
            const isCurrentlyCollapsed = collapsedPanels.has(panelId);

            if (isCurrentlyCollapsed) {
                panelRef?.resize(35);
                handlePanelExpand(panelId);
            } else {
                panelRef?.resize(3);
                handlePanelCollapse(panelId);
            }
        },
        [collapsedPanels, handlePanelExpand, handlePanelCollapse]
    );

    return (
        <div className={`h-full relative ${className}`}>
            <Group
                orientation='vertical'
                className='h-full'
                groupRef={panelGroupRef}
            >
                {panels.map((panel, index) => {
                    const isLastPanel = index === panels.length - 1;
                    const remainingSize = 100 - (panels.length - 1) * 10;
                    const isCollapsed = collapsedPanels.has(panel.id);

                    return (
                        <React.Fragment key={panel.id}>
                            <Panel
                                panelRef={(ref: PanelImperativeHandle | null) => registerPanelRef(panel.id, ref)}
                                id={panel.id}
                                defaultSize={isLastPanel ? remainingSize : 10}
                                minSize={10}
                                maxSize={100}
                                collapsible={true}
                                collapsedSize={3}
                                onCollapse={() => handlePanelCollapse(panel.id)}
                                onExpand={() => handlePanelExpand(panel.id)}
                                order={panel.order}
                            >
                                {renderPanel(panel, isCollapsed)}
                            </Panel>
                            {!isLastPanel && <Separator />}
                        </React.Fragment>
                    );
                })}

                {showAddButton && (
                    <Button
                        variant='ghost'
                        className='w-full mt-2'
                        onClick={onPanelAdd}
                    >
                        <Plus className='h-4 w-4 mr-2' />
                        {addButtonLabel}
                    </Button>
                )}
            </Group>

            <AlertDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Panel</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this panel? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (activePanelId && onPanelDelete) {
                                    onPanelDelete(activePanelId);
                                }
                                setDialogOpen(false);
                                setActivePanelId(null);
                            }}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
