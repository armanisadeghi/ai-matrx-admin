// components/ui/resizable-bottom-panel.tsx
import React from 'react';
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from '@/components/ui/resizable';
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

const ResizableBottomPanel2: React.FC<ResizableBottomPanelProps> = (
    {
        className = '',
        defaultExpanded = false,
        isExpanded: controlledExpanded,
        onExpandedChange,
        defaultSize = 25,
        minSize = 10,
        maxSize = 90,
        header,
        children,
        expandButtonProps = {
            label: 'Expand Panel',
            className: 'fixed bottom-4 right-4'
        }
    }) => {
    const [localExpanded, setLocalExpanded] = React.useState(defaultExpanded);
    const [isFullScreen, setIsFullScreen] = React.useState(false);
    const isExpanded = controlledExpanded ?? localExpanded;

    const handleToggle = () => {
        const newValue = !isExpanded;
        setLocalExpanded(newValue);
        onExpandedChange?.(newValue);
    };

    const handleFullScreenToggle = () => {
        setIsFullScreen(!isFullScreen);
    };

    if (!isExpanded) {
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={handleToggle}
                className={`bg-background border shadow-md h-6 px-2 py-1 text-xs z-50 ${expandButtonProps.className}`}
            >
                <ChevronUp className="h-3 w-3 mr-1"/>
                {expandButtonProps.label}
            </Button>
        );
    }

    const containerStyles = isFullScreen
                            ? 'fixed inset-0 z-50'
                            : 'fixed bottom-0 left-0 right-0 z-50';

    return (
        <div className={`${containerStyles} pointer-events-none ${className}`}>
            <div className={`pointer-events-auto h-${isFullScreen ? 'screen' : '[50vh]'}`}>
                <ResizablePanelGroup
                    orientation="vertical"
                    className="h-full"
                >
                    {!isFullScreen && (
                        <>
                            <ResizablePanel
                                defaultSize={100 - defaultSize}
                                minSize={100 - maxSize}
                                maxSize={100 - minSize}
                            >
                                <div className="h-full pointer-events-none"/>
                            </ResizablePanel>
                            <ResizableHandle withHandle/>
                        </>
                    )}
                    <ResizablePanel
                        defaultSize={isFullScreen ? 100 : defaultSize}
                        minSize={isFullScreen ? 100 : minSize}
                        maxSize={isFullScreen ? 100 : maxSize}
                    >
                        <Card className="h-full border-t shadow-lg overflow-hidden">
                            <div className="border-b p-3 flex items-center justify-between bg-background sticky top-0">
                                <div className="flex-1">{header}</div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleFullScreenToggle}
                                        className="h-6 px-2"
                                    >
                                        {isFullScreen ? <Minimize2 className="h-3 w-3"/> : <Maximize2
                                            className="h-3 w-3"/>}
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
                            <div className="overflow-auto h-[calc(100%-3.75rem)]">
                                {children}
                            </div>
                        </Card>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
};

export default ResizableBottomPanel2;


/* Usage Example:

<ResizableBottomPanel
    header={<h2>Debug Console</h2>}
    expandButtonProps={{
        label: 'Show Console',
        className: 'fixed bottom-4 left-4'
    }}
>
    <ConsoleOutput />
</ResizableBottomPanel>

*/
