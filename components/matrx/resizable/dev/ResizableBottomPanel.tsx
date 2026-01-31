import React from 'react';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui';
import {Button} from '@/components/ui/button';
import {ChevronUp, ChevronDown, Maximize2, Minimize2} from 'lucide-react';
import {Card} from '@/components/ui/card';

interface ResizableBottomPanelProps {
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

const ResizableBottomPanel: React.FC<ResizableBottomPanelProps> = (
    {
        className = '',
        defaultExpanded = false,
        isExpanded: controlledExpanded,
        onExpandedChange,
        defaultSize = 50,
        minSize = 5,
        maxSize = 95,
        header,
        children,
        expandButtonProps = {
            label: 'Expand Panel',
            className: 'fixed bottom-4 right-4'
        }
    }) => {
    const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [lastSize, setLastSize] = React.useState(defaultSize);
    const [preFullScreenSize, setPreFullScreenSize] = React.useState<number | null>(null);
    const isExpanded = controlledExpanded ?? localExpanded;

    const handleToggle = () => {
        const newValue = !isExpanded;
        setLocalExpanded(newValue);
        onExpandedChange?.(newValue);
    };

    const handleFullScreenToggle = () => {
        setIsFullScreen(prev => {
            if (!prev) {
                // Going to fullscreen - store current size
                setPreFullScreenSize(lastSize);
            } else {
                // Exiting fullscreen - restore size
                if (preFullScreenSize !== null) {
                    setLastSize(preFullScreenSize);
                }
            }
            return !prev;
        });
    };

    const handlePanelResize = (sizes: number[]) => {
        if (!isFullScreen && sizes[1] >= minSize && sizes[1] <= maxSize) {
            setLastSize(sizes[1]);
        }
    };

    const getPanelSizes = () => {
        if (isFullScreen) {
            return {
                topPanel: {
                    defaultSize: 0,
                    minSize: 0,
                    maxSize: 0,
                },
                bottomPanel: {
                    defaultSize: 100,
                    minSize: 100,
                    maxSize: 100,
                }
            };
        }

        const currentSize = preFullScreenSize ?? lastSize;

        return {
            topPanel: {
                defaultSize: 100 - currentSize,
                minSize: 100 - maxSize,
                maxSize: 100 - minSize,
            },
            bottomPanel: {
                defaultSize: currentSize,
                minSize,
                maxSize,
            }
        };
    };

    if (!isExpanded) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggle}
                    className="bg-background border shadow-md h-6 px-2 py-1 text-xs"
                >
                    <ChevronUp className="h-3 w-3 mr-1"/>
                    {expandButtonProps.label}
                </Button>
            </div>
        );
    }

    const panelSizes = getPanelSizes();

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-[100]"
            style={{
                height: '100vh',
                willChange: 'transform',
                isolation: 'isolate',
            }}
        >
            <ResizablePanelGroup
                orientation="vertical"
                className="h-full"
                onLayout={handlePanelResize}
                style={{
                    touchAction: 'none',
                    userSelect: 'none',
                }}
            >
                <ResizablePanel
                    {...panelSizes.topPanel}
                    style={{visibility: isFullScreen ? 'hidden' : 'visible'}}
                >
                    <div className="h-full"/>
                </ResizablePanel>

                <ResizableHandle
                    withHandle
                    size="lg"
                    style={{visibility: isFullScreen ? 'hidden' : 'visible'}}
                    className="hover:cursor-row-resize active:cursor-row-resize"
                />

                <ResizablePanel {...panelSizes.bottomPanel}>
                    <Card
                        className="h-full border-t shadow-lg"
                        style={{
                            touchAction: 'pan-y',
                            transform: 'translate3d(0,0,0)',
                        }}
                    >
                        <div
                            className="border-b p-3 flex items-center justify-between bg-background sticky top-0"
                            style={{zIndex: 10}}
                        >
                            <div className="flex-1">{header}</div>
                            <div className="flex gap-2">
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
                                    <ChevronDown className="h-3 w-3"/>
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

export default ResizableBottomPanel;
