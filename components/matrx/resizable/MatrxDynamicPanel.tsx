import React from 'react';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui';
import {Button} from '@/components/ui/button';
import {
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    Maximize2,
    Minimize2,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    Move
} from 'lucide-react';
import {Card} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {cn} from '@/lib/utils';
import {ImperativePanelGroupHandle} from 'react-resizable-panels';
import type {CSSProperties} from 'react';

type PanelPosition = 'left' | 'right' | 'top' | 'bottom';

interface PositionControlProps {
    position: PanelPosition;
    onPositionChange: (newPosition: PanelPosition) => void;
    isVertical: boolean;
}

const PositionControl: React.FC<PositionControlProps> = (
    {
        position,
        onPositionChange,
        isVertical
    }) => {
    const positionIcons = {
        left: ArrowLeft,
        right: ArrowRight,
        top: ArrowUp,
        bottom: ArrowDown
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                >
                    <Move className="h-3 w-3"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="z-[200]"
                sideOffset={8}
            >
                {(Object.keys(positionIcons) as PanelPosition[]).map((pos) => {
                    const Icon = positionIcons[pos];
                    return (
                        <DropdownMenuItem
                            key={pos}
                            onClick={() => onPositionChange(pos)}
                            className={cn(
                                "gap-2",
                                position === pos && "bg-accent"
                            )}
                        >
                            <Icon className="h-3 w-3"/>
                            <span className="capitalize">{pos}</span>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface MatrxDynamicPanelProps {
    initialPosition?: PanelPosition;
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

const MatrxDynamicPanel: React.FC<MatrxDynamicPanelProps> = (
    {
        initialPosition = 'right',
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
    const [currentPosition, setCurrentPosition] = React.useState<PanelPosition>(initialPosition);
    const isExpanded = controlledExpanded ?? localExpanded;

    const panelGroupRef = React.useRef<ImperativePanelGroupHandle>(null);
    const isVertical = currentPosition === 'top' || currentPosition === 'bottom';
    const isStartPosition = currentPosition === 'left' || currentPosition === 'top';

    React.useEffect(() => {
        setCurrentPosition(initialPosition);
    }, [initialPosition]);

    React.useEffect(() => {
        if (!isFullScreen && preFullScreenSize !== null) {
            setPanelKey(prev => prev + 1);
        }
    }, [isFullScreen, preFullScreenSize]);

    const handlePositionChange = (newPosition: PanelPosition) => {
        setCurrentPosition(newPosition);
        setPanelKey(prev => prev + 1);
    };

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
        const sizeIndex = isStartPosition ? 0 : 1;
        if (sizes[sizeIndex] >= minSize && sizes[sizeIndex] <= maxSize) {
            setLastSize(sizes[sizeIndex]);
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

    const handleStyles = (isVertical: boolean, isFullScreen: boolean): CSSProperties => ({
        visibility: isFullScreen ? 'hidden' as const : 'visible' as const,
        ...(isVertical ? {
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        } : {})
    });

    const getPositionStyles = () => {
        const positionMap = {
            left: {
                container: 'fixed inset-y-0 left-0',
                dimensions: {width: '100vw'},
                button: 'left-4 top-4',
                panel: 'left-0',
                border: 'border-r',
                chevron: {
                    collapsed: ChevronRight,
                    expanded: ChevronLeft
                }
            },
            right: {
                container: 'fixed inset-y-0 right-0',
                dimensions: {width: '100vw'},
                button: 'right-4 top-4',
                panel: 'right-0',
                border: 'border-l',
                chevron: {
                    collapsed: ChevronLeft,
                    expanded: ChevronRight
                }
            },
            top: {
                container: 'fixed inset-x-0 top-0',
                dimensions: {height: '100vh'},
                button: 'top-4 left-4',
                panel: 'top-0',
                border: 'border-b',
                chevron: {
                    collapsed: ChevronDown,
                    expanded: ChevronUp
                }
            },
            bottom: {
                container: 'fixed inset-x-0 bottom-0',
                dimensions: {height: '100vh'},
                button: 'bottom-4 right-4',
                panel: 'bottom-0',
                border: 'border-t',
                chevron: {
                    collapsed: ChevronUp,
                    expanded: ChevronDown
                }
            }
        };

        return positionMap[currentPosition];
    };

    if (!isExpanded) {
        const styles = getPositionStyles();
        const ChevronIcon = styles.chevron.collapsed;

        return (
            <div className={cn(`fixed ${styles.button} z-50`, expandButtonProps.className)}>
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
    const styles = getPositionStyles();
    const ChevronIcon = styles.chevron.expanded;

    const panels = [
        <ResizablePanel
            key="spacer"
            {...panelSizes.spacerPanel}
            style={{
                visibility: isFullScreen ? 'hidden' : 'visible',
                touchAction: 'none',
                pointerEvents: 'none',
            }}
        >
            <div className="h-full"/>
            {/*<div style={{*/}
            {/*    height: '100%',*/}
            {/*    width: '100%',*/}
            {/*    pointerEvents: 'none'*/}
            {/*}}/>*/}

        </ResizablePanel>,

        <ResizableHandle
            key="handle"
            withHandle
            size="lg"
            style={handleStyles(isVertical, isFullScreen)}
            className={cn(
                isVertical
                ? "hover:cursor-row-resize active:cursor-row-resize"
                : "hover:cursor-col-resize active:cursor-col-resize"
            )}
        />,

        <ResizablePanel
            key="content"
            {...panelSizes.contentPanel}
            defaultSize={panelSizes.contentPanel.defaultSize}
        >
            <Card
                className={cn("h-full shadow-lg", styles.border)}
                style={{
                    touchAction: 'pan-y',
                    transform: 'translate3d(0,0,0)',
                    pointerEvents: 'auto',
                }}
            >
                <div
                    className={cn(
                        "border-b p-3 flex items-center bg-background sticky top-0",
                        isVertical ? "justify-between" : "flex-wrap gap-2"
                    )}
                    style={{zIndex: 10}}
                >
                    <div className={isVertical ? "flex-1" : "flex-1 min-w-[200px]"}>
                        {header}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <PositionControl
                            position={currentPosition}
                            onPositionChange={handlePositionChange}
                            isVertical={isVertical}
                        />
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
        </ResizablePanel>
    ];

    return (
        <div
            className={cn(styles.container, "z-[100]", className)}
            style={{
                ...styles.dimensions,
                willChange: 'transform',
                isolation: 'isolate',
                pointerEvents: 'none',
            }}
        >
            <ResizablePanelGroup
                key={panelKey}
                ref={panelGroupRef}
                direction={isVertical ? 'vertical' : 'horizontal'}
                className="h-full"
                onLayout={handlePanelResize}
                style={{
                    touchAction: 'none',
                    userSelect: 'none',
                    // pointerEvents: 'auto',
                }}
            >
                {isStartPosition ? panels.reverse() : panels}
            </ResizablePanelGroup>
        </div>
    );
};

export default MatrxDynamicPanel;
