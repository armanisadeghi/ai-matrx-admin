import React from 'react';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui';
import {Button} from '@/components/ui/button';
import {ChevronLeft, ChevronRight, Maximize2, Minimize2} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {cn} from '@/lib/utils';
import {ImperativePanelGroupHandle} from 'react-resizable-panels';

interface ResizableRightPanelProps {
    className?: string;
    defaultExpanded?: boolean;
    isExpanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    header?: React.ReactNode;
    children: React.ReactNode;
    expandButtonProps?: {
        label?: string;
        className?: string;
    };
}

const ResizableRightPanel: React.FC<ResizableRightPanelProps> = (
    {
        className = '',
        defaultExpanded = false,
        isExpanded: controlledExpanded,
        onExpandedChange,
        defaultSize = 20,
        minSize = 1,
        maxSize = 100,
        header,
        children,
        expandButtonProps = {
            label: 'Expand Panel',
            className: 'fixed right-4 top-4'
        }
    }) => {
    const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [lastSize, setLastSize] = React.useState(defaultSize);
    const [preFullScreenSize, setPreFullScreenSize] = React.useState<number | null>(defaultSize);
    const [panelKey, setPanelKey] = React.useState(0);
    const isExpanded = controlledExpanded ?? localExpanded;

    const panelGroupRef = React.useRef<ImperativePanelGroupHandle>(null);

    React.useEffect(() => {
        if (!isFullScreen && preFullScreenSize !== null) {
            setPanelKey(prev => prev + 1);
        }
    }, [isFullScreen, preFullScreenSize]);

    const handleToggle = () => {
        const newValue = !isExpanded;
        setLocalExpanded(newValue);
        onExpandedChange?.(newValue);
    };

    const handleFullScreenToggle = () => {
        setIsFullScreen(prev => {
            if (!prev) {
                setPreFullScreenSize(lastSize);
                return true;
                }
            return false;
        });
    };

    const handlePanelResize = (sizes: number[]) => {
        if (sizes[1] >= minSize && sizes[1] <= maxSize) {
            setLastSize(sizes[1]);
        }
    };

    const getPanelSizes = () => {
        if (isFullScreen) {
            return {
                spacerPanel: {
                    defaultSize: 0,
                    minSize: 0,
                    maxSize: 0,
                },
                contentPanel: {
                    defaultSize: 100,
                    minSize: 100,
                    maxSize: 100,
                }
            };
        }

        const currentSize = preFullScreenSize ?? lastSize;

        return {
            spacerPanel: {
                defaultSize: 100 - currentSize,
                minSize: 100 - maxSize,
                maxSize: 100 - minSize,
            },
            contentPanel: {
                defaultSize: currentSize,
                minSize,
                maxSize,
            }
        };
    };

    if (!isExpanded) {
        return (
            <div className={cn("fixed top-4 right-4 z-50", expandButtonProps.className)}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggle}
                    className="bg-background border shadow-md h-6 px-2 py-1 text-xs"
                >
                    <ChevronLeft className="h-3 w-3 mr-1"/>
                    {expandButtonProps.label}
                </Button>
            </div>
        );
    }

    const panelSizes = getPanelSizes();

    return (
        <div
            className={cn(
                "fixed inset-y-0 right-0 z-[100]",
                className
            )}
            style={{
                width: '100vw',
                willChange: 'transform',
                isolation: 'isolate',
            }}
        >
            <ResizablePanelGroup
                key={panelKey}
                ref={panelGroupRef}
                direction="horizontal"
                className="h-full"
                onLayout={handlePanelResize}
                style={{
                    touchAction: 'none',
                    userSelect: 'none',
                }}
            >
                <ResizablePanel
                    {...panelSizes.spacerPanel}
                    style={{visibility: isFullScreen ? 'hidden' : 'visible'}}
                >
                    <div className="h-full"/>
                </ResizablePanel>

                <ResizableHandle
                    withHandle
                    size="lg"
                    style={{visibility: isFullScreen ? 'hidden' : 'visible'}}
                    className="hover:cursor-col-resize active:cursor-col-resize"
                />

                <ResizablePanel
                    {...panelSizes.contentPanel}
                    defaultSize={panelSizes.contentPanel.defaultSize}
                >
                    <Card
                        className="h-full border-l shadow-lg"
                        style={{
                            touchAction: 'pan-x',
                            transform: 'translate3d(0,0,0)',
                        }}
                    >
                        <div
                            className="border-b p-3 flex flex-wrap items-center gap-2 bg-background sticky top-0"
                            style={{zIndex: 10}}
                        >
                            <div className="flex-1 min-w-[200px]">
                                {header}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleFullScreenToggle}
                                    className="h-6 px-2"
                                >
                                    {isFullScreen ?
                                     <Minimize2 className="h-3 w-3"/> :
                                     <Maximize2 className="h-3 w-3"/>
                                    }
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleToggle}
                                    className="h-6 px-2"
                                >
                                    <ChevronRight className="h-3 w-3"/>
                                </Button>
                            </div>
                        </div>
                        <div
                            className="overflow-auto"
                            style={{
                                height: 'calc(100% - 48px)',
                                touchAction: 'pan-y',
                            }}
                        >
                            {children}
                        </div>
                    </Card>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    );
};

export default ResizableRightPanel;
