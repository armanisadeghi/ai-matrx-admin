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
import {GroupImperativeHandle, type Layout} from 'react-resizable-panels';

interface ResizableSidePanelProps {
    position?: 'left' | 'right';
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

const ResizableSidePanel: React.FC<ResizableSidePanelProps> = (
    {
        position = 'right',
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
            className: undefined
        }
    }) => {
    const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const [lastSize, setLastSize] = React.useState(defaultSize);
    const [preFullScreenSize, setPreFullScreenSize] = React.useState<number | null>(defaultSize);
    const [panelKey, setPanelKey] = React.useState(0);
    const isExpanded = controlledExpanded ?? localExpanded;

    const panelGroupRef = React.useRef<GroupImperativeHandle>(null);

    const isLeftPosition = position === 'left';

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

    const handlePanelResize = (layout: Layout) => {
        const sizeIndex = isLeftPosition ? 0 : 1;
        if (layout[sizeIndex] >= minSize && layout[sizeIndex] <= maxSize) {
            setLastSize(layout[sizeIndex]);
        }
    };

    const getPanelSizes = () => {
        if (isFullScreen) {
            return {
                contentPanel: {
                    defaultSize: 100,
                    minSize: 100,
                    maxSize: 100,
                },
                spacerPanel: {
                    defaultSize: 0,
                    minSize: 0,
                    maxSize: 0,
                }
            };
        }

        const currentSize = preFullScreenSize ?? lastSize;

        return {
            contentPanel: {
                defaultSize: currentSize,
                minSize,
                maxSize,
            },
            spacerPanel: {
                defaultSize: 100 - currentSize,
                minSize: 100 - maxSize,
                maxSize: 100 - minSize,
            }
        };
    };

    if (!isExpanded) {
        const buttonPosition = isLeftPosition ? 'left-4' : 'right-4';
        const ChevronIcon = isLeftPosition ? ChevronRight : ChevronLeft;

        return (
            <div className={cn(`fixed top-4 ${buttonPosition} z-50`, expandButtonProps.className)}>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggle}
                    className="bg-background border shadow-md h-6 px-2 py-1 text-xs"
                >
                    <ChevronIcon className="h-3 w-3 mr-1"/>
                    {expandButtonProps.label}
                </Button>
            </div>
        );
    }

    const panelSizes = getPanelSizes();
    const ChevronIcon = isLeftPosition ? ChevronLeft : ChevronRight;
    const borderClass = isLeftPosition ? 'border-r' : 'border-l';
    const sidePosition = isLeftPosition ? 'left-0' : 'right-0';

    const panels = [
        <ResizablePanel
            key="content"
            {...panelSizes.contentPanel}
            defaultSize={panelSizes.contentPanel.defaultSize}
        >
            <Card
                className={cn("h-full shadow-lg", borderClass)}
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
                            <ChevronIcon className="h-3 w-3"/>
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
        </ResizablePanel>,
        <ResizableHandle
            key="handle"
            withHandle
            size="lg"
            style={{visibility: isFullScreen ? 'hidden' : 'visible'}}
            className="hover:cursor-col-resize active:cursor-col-resize"
        />,
        <ResizablePanel
            key="spacer"
            {...panelSizes.spacerPanel}
            style={{visibility: isFullScreen ? 'hidden' : 'visible'}}
        >
            <div className="h-full"/>
        </ResizablePanel>
    ];

    return (
        <div
            className={cn(
                `fixed inset-y-0 ${sidePosition} z-[100]`,
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
                groupRef={panelGroupRef}
                orientation="horizontal"
                className="h-full"
                onLayoutChanged={handlePanelResize}
                style={{
                    touchAction: 'none',
                    userSelect: 'none',
                }}
            >
                {isLeftPosition ? panels : panels.reverse()}
            </ResizablePanelGroup>
        </div>
    );
};

export default ResizableSidePanel;
