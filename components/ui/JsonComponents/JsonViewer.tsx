'use client';

import React, {useState, useCallback, useMemo} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {Copy, ChevronDown, ChevronRight, ChevronUp, Maximize2, Minimize2, BracketsIcon, Expand} from 'lucide-react';

interface JsonViewerItemProps {
    keyName: string;
    value: any;
    isExpanded: boolean;
    onToggle: (key: string) => void;
    isKeyExpanded: (key: string) => boolean;
    disabled?: boolean;
    className?: string;
    path: string;
    isLastItem: boolean;
}

const JsonViewerItem: React.FC<JsonViewerItemProps> = (
    {
        keyName,
        value,
        isExpanded,
        onToggle,
        isKeyExpanded,
        disabled = false,
        className,
        path,
        isLastItem,
    }) => {
    const [showFullItem, setShowFullItem] = useState<{ [key: string]: boolean }>({});
    const isObject = typeof value === 'object' && value !== null;
    const isArray = Array.isArray(value);
    const hasContent = isObject && Object.keys(value).length > 0;

    const toggleShowFullItem = (itemPath: string) => {
        setShowFullItem(prev => ({
            ...prev,
            [itemPath]: !prev[itemPath]
        }));
    };
    const isSmallArray = isArray && value.length <= 4 && value.every(item =>
        typeof item !== 'object' ||
        (item === null) ||
        (typeof item === 'object' && Object.keys(item).length === 0)
    );


    const renderArrayItem = (item: any, itemPath: string, index: number, isLastItem: boolean) => {
        if (typeof item === 'object' && item !== null) {
            const entries = Object.entries(item);
            const shouldTruncate = entries.length > 4;
            const displayEntries = showFullItem[itemPath] ? entries : entries.slice(0, 4);

            return (
                <div className={cn(
                    "pl-4 py-1",
                    !isLastItem && "border-b border-border/30"
                )}>
                    {displayEntries.map(([k, v], idx, arr) => (
                        <JsonViewerItem
                            key={`${itemPath}.${k}`}
                            path={`${itemPath}.${k}`}
                            keyName={k}
                            value={v}
                            isExpanded={isKeyExpanded(`${itemPath}.${k}`)}
                            onToggle={onToggle}
                            isKeyExpanded={isKeyExpanded}
                            disabled={disabled}
                            isLastItem={idx === arr.length - 1}
                            className={className}
                        />
                    ))}
                    {shouldTruncate && (
                        <div
                            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer pl-2 mt-1"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleShowFullItem(itemPath);
                            }}
                        >
                            {showFullItem[itemPath] ?
                             "Show less..." :
                             `Show ${entries.length - 4} more items...`}
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className={cn(
                "pl-4 py-1",
                !isLastItem && "border-b border-border/30"
            )}>
                <span
                    className={cn(
                        "text-md",
                        disabled && "text-muted-foreground",
                        !disabled && {
                            "text-green-500": typeof item === 'string',
                            "text-blue-500": typeof item === 'number',
                            "text-yellow-500": typeof item === 'boolean',
                            "text-red-500": item === null,
                        }
                    )}
                >
                    {item === null ? 'null' : JSON.stringify(item)}
                </span>
            </div>
        );
    };

    const renderInlineArray = (arr: any[]) => {
        return (
            <span className="text-blue-500">
                [
                {arr.map((item, index) => (
                    <React.Fragment key={index}>
                        <span className={cn(
                            disabled && "text-muted-foreground",
                            !disabled && {
                                "text-green-500": typeof item === 'string',
                                "text-blue-500": typeof item === 'number',
                                "text-yellow-500": typeof item === 'boolean',
                                "text-red-500": item === null,
                            }
                        )}>
                            {item === null ? 'null' : JSON.stringify(item)}
                        </span>
                        {index < arr.length - 1 && ", "}
                    </React.Fragment>
                ))}
                ]
            </span>
        );
    };

    return (
        <div
            className={cn(
                "relative",
                !isLastItem && "border-l border-border/30",
                disabled && "opacity-70",
                className
            )}
        >
            <div
                className={cn(
                    "flex items-center gap-0.5 py-0.5 group",
                    hasContent && !isSmallArray && "cursor-pointer hover:bg-muted"
                )}
                onClick={hasContent && !isSmallArray && !disabled ? () => onToggle(path) : undefined}
            >
                {hasContent && !isSmallArray ? (
                    <div className="flex items-center">
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 transition-transform",
                                !isExpanded && "rotate-[-90deg]"
                            )}
                        />
                    </div>
                ) : (
                     <div className="w-1"/>
                 )}
                <div className="flex-1 flex items-center">
                    <span
                        className={cn(
                            "font-medium text-md",
                            disabled ? "text-muted-foreground" : "text-foreground"
                        )}
                    >
                        {keyName}
                    </span>
                    {isArray && (
                        <BracketsIcon className="h-3 w-3 ml-1 text-blue-500 inline"/>
                    )}
                    <span className="mx-1">:</span>
                    {!isObject && (
                        <span
                            className={cn(
                                "text-md",
                                disabled && "text-muted-foreground",
                                !disabled && {
                                    "text-green-500": typeof value === 'string',
                                    "text-blue-500": typeof value === 'number',
                                    "text-yellow-500": typeof value === 'boolean',
                                    "text-red-500": value === null,
                                }
                            )}
                        >
                            {value === null ? 'null' : JSON.stringify(value)}
                        </span>
                    )}
                    {isObject && !hasContent && (
                        <span className="text-md text-muted-foreground italic">
                            {isArray ? '[]' : '{}'}
                        </span>
                    )}
                    {isSmallArray && hasContent && renderInlineArray(value)}
                    {isArray && !isSmallArray && hasContent && !isExpanded && (
                        <span className="text-muted-foreground ml-1">
                            [{value.length} items]
                        </span>
                    )}
                </div>
            </div>
            {hasContent && !isSmallArray && isExpanded && (
                <AnimatePresence>
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.2}}
                        className="pl-2"
                    >
                        {isArray ? (
                            <div className="flex flex-col border-l border-border/30">
                                {value.map((item, index) =>
                                    renderArrayItem(
                                        item,
                                        `${path}.${index}`,
                                        index,
                                        index === value.length - 1
                                    )
                                )}
                            </div>
                        ) : (
                             Object.entries(value).map(([k, v], index, arr) => (
                                 <JsonViewerItem
                                     key={`${path}.${k}`}
                                     path={`${path}.${k}`}
                                     keyName={k}
                                     value={v}
                                     isExpanded={isKeyExpanded(`${path}.${k}`)}
                                     onToggle={onToggle}
                                     isKeyExpanded={isKeyExpanded}
                                     disabled={disabled}
                                     isLastItem={index === arr.length - 1}
                                     className={className}
                                 />
                             ))
                         )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};

interface JsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: any;
    className?: string;
    initialExpanded?: boolean;
    maxHeight?: string;
    disabled?: boolean;
    hideControls?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = (
    {
        data,
        className,
        initialExpanded = false,
        maxHeight = '400px',
        disabled = false,
        hideControls = false,
        ...props
    }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    const parsedData = useMemo(() => {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch {
                return null;
            }
        }
        return typeof data === 'object' && data !== null ? data : null;
    }, [data]);

    const copyToClipboard = useCallback(() => {
        if (disabled) return;
        navigator.clipboard.writeText(JSON.stringify(parsedData, null, 2));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }, [parsedData, disabled]);

    const toggleExpand = useCallback(
        (key: string) => {
            if (disabled) return;
            setExpandedKeys((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(key)) {
                    newSet.delete(key);
                } else {
                    newSet.add(key);
                }
                return newSet;
            });
        },
        [disabled]
    );

    const isKeyExpanded = useCallback(
        (key: string) => expandedKeys.has(key),
        [expandedKeys]
    );

    const hasExpandableItems = useCallback((obj: any): boolean => {
        if (typeof obj !== 'object' || obj === null) return false;
        return Object.values(obj).some(value =>
            typeof value === 'object' && value !== null && Object.keys(value).length > 0
        );
    }, []);

    const expandAll = useCallback(() => {
        if (disabled || !parsedData) return;
        const allKeys = getAllKeys(parsedData);
        setExpandedKeys(new Set(allKeys));
    }, [parsedData, disabled]);

    const collapseAll = useCallback(() => {
        if (disabled) return;
        setExpandedKeys(new Set());
    }, [disabled]);

    const getAllKeys = useCallback((obj: any, currentPath = ''): string[] => {
        let keys: string[] = [];
        for (const key in obj) {
            const fullPath = currentPath ? `${currentPath}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && Object.keys(obj[key]).length > 0) {
                keys.push(fullPath);
                keys = keys.concat(getAllKeys(obj[key], fullPath));
            }
        }
        return keys;
    }, []);

    const isEmpty = !parsedData || (typeof parsedData === 'object' && Object.keys(parsedData).length === 0);
    const showControls = !hideControls && !isEmpty && (hasExpandableItems(parsedData) || parsedData);

    if (isEmpty) {
        return (
            <div
                className={cn(
                    "bg-background text-muted-foreground p-2 text-sm rounded-md border border-border/30",
                    className
                )}
            >
                {!parsedData ? 'Invalid JSON' : '{Empty JSON}'}
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative bg-background text-foreground rounded-md overflow-auto border border-border/30",
                disabled && "opacity-70 pointer-events-none",
                className
            )}
            style={{maxHeight}}
            {...props}
        >
            {showControls && (
                <div className="absolute right-2 top-2 flex flex-col gap-2 z-10">
                    {hasExpandableItems(parsedData) && (
                        <Button
                            variant="outline"
                            size="xs"
                            onClick={expandedKeys.size ? collapseAll : expandAll}
                            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                            disabled={disabled}
                        >
                            {expandedKeys.size ? (
                                <ChevronUp className="h-3 w-3"/>
                            ) : (
                                 <ChevronDown className="h-3 w-3"/>
                             )}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="xs"
                        onClick={copyToClipboard}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={disabled}
                    >
                        <Copy className="h-3 w-3"/>
                    </Button>
                </div>
            )}
            <div className="pl-1 pt-1 pb-2 pr-10">
                {Object.entries(parsedData).map(([key, value], index, arr) => (
                    <JsonViewerItem
                        key={key}
                        path={key}
                        keyName={key}
                        value={value}
                        isExpanded={isKeyExpanded(key)}
                        onToggle={toggleExpand}
                        isKeyExpanded={isKeyExpanded}
                        disabled={disabled}
                        isLastItem={index === arr.length - 1}
                    />
                ))}
            </div>
        </div>
    );
};


export interface FullJsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object | string;
    title?: string;
    initialExpanded?: boolean;
    maxHeight?: string;
    className?: string;
    disabled?: boolean;
    hideControls?: boolean;
    hideTitle?: boolean;
}

export const FullJsonViewer: React.FC<FullJsonViewerProps> = (
    {
        data,
        title = "JSON Data",
        className,
        disabled = false,
        hideControls = false,
        hideTitle = false,
        ...props
    }) => {
    return (
        <Card
            className={cn(
                "p-1 bg-card",
                disabled && "opacity-70",
                className
            )}
        >
            {!hideTitle && (
                <h3 className={cn(
                    "text-xs font-semibold mb-1",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}>
                    {title}
                </h3>
            )}
            <JsonViewer
                data={data}
                disabled={disabled}
                hideControls={hideControls}
                {...props}
            />
        </Card>
    );
};


export interface EnhancedJsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object | string;
    title?: string;
    initialExpanded?: boolean;
    maxHeight?: string;
    className?: string;
    allowMinimize?: boolean;
    isMinimized?: boolean;
    onMinimizeChange?: (isMinimized: boolean) => void;
    id?: string;
    hideHeader?: boolean;
    disabled?: boolean;
    hideControls?: boolean;
}

export const EnhancedJsonViewer: React.FC<EnhancedJsonViewerProps> = (
    {
        data,
        title = "JSON Data",
        className,
        allowMinimize = false,
        isMinimized: controlledIsMinimized,
        onMinimizeChange,
        id,
        hideHeader = false,
        disabled = false,
        hideControls = false,
        ...props
    }) => {
    const [localIsMinimized, setLocalIsMinimized] = useState(false);
    const isMinimized = controlledIsMinimized ?? localIsMinimized;

    const handleMinimizeToggle = () => {
        if (disabled) return;
        const newValue = !isMinimized;
        setLocalIsMinimized(newValue);
        onMinimizeChange?.(newValue);
    };

    const renderViewerContent = () => (
        <JsonViewer
            data={data}
            title={hideHeader ? title : undefined}
            disabled={disabled}
            hideControls={hideControls}
            {...props}
        />
    );

    if (disabled && isMinimized) {
        // Don't allow minimized state when disabled
        return (
            <Card className={cn("bg-card opacity-70", className)}>
                {!hideHeader && (
                    <div className="flex justify-between items-center mb-1 p-1">
                        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
                    </div>
                )}
                <div className={cn(!hideHeader && "px-1 pb-1")}>
                    {renderViewerContent()}
                </div>
            </Card>
        );
    }

    return (
        <motion.div
            layout
            initial={false}
            className={cn(
                "relative",
                disabled && "opacity-70 pointer-events-none",
                className
            )}
            transition={{type: "spring", bounce: 0.2}}
        >
            <AnimatePresence mode="wait">
                {isMinimized ? (
                    <motion.div
                        key="minimized"
                        initial={{opacity: 0, scale: 0.8}}
                        animate={{opacity: 1, scale: 1}}
                        exit={{opacity: 0, scale: 0.8}}
                        className={cn(
                            "flex items-center gap-3 bg-secondary rounded-full px-4 py-1 shadow-xl border group", // Added group
                            !disabled && "cursor-pointer hover:bg-primary text-foreground",
                        )}
                        onClick={handleMinimizeToggle}
                    >
                        <span className={cn(
                            "text-md font-medium truncate max-w-[200px]",
                            disabled && "text-muted-foreground"
                        )}>
                            {title}
                        </span>
                        <Expand className={cn(
                            "h-4 w-4",
                            disabled
                            ? "text-muted-foreground"
                            : "text-primary group-hover:text-foreground" // Changed to group-hover
                        )}/>
                    </motion.div>) : (
                     <motion.div
                         key="expanded"
                         initial={{opacity: 0, scale: 0.95}}
                         animate={{opacity: 1, scale: 1}}
                         exit={{opacity: 0, scale: 0.95}}
                     >
                         <Card className={cn("bg-card", !hideHeader && "p-2")}>
                             {!hideHeader && (
                                 <div className="flex justify-between items-center mb-1">
                                     <h3 className={cn(
                                         "text-sm font-semibold",
                                         disabled ? "text-muted-foreground" : "text-foreground"
                                     )}>
                                         {title}
                                     </h3>
                                     {allowMinimize && !disabled && (
                                         <Button
                                             variant="ghost"
                                             size="sm"
                                             onClick={handleMinimizeToggle}
                                             className="h-6 w-6 p-0"
                                         >
                                             <Minimize2 className="h-4 w-4"/>
                                         </Button>
                                     )}
                                 </div>
                             )}
                             <div className={cn(!hideHeader && "mt-0")}>
                                 {renderViewerContent()}
                             </div>
                         </Card>
                     </motion.div>
                 )}
            </AnimatePresence>
        </motion.div>
    );
};


interface EnhancedJsonViewerGroupProps {
    viewers: Array<{
        id: string;
        data: object | string;
        title: string;
        allowMinimize?: boolean;
        disabled?: boolean;
        hideControls?: boolean;
        hideHeader?: boolean;
        maxHeight?: string;
        className?: string;
    }>;
    layout?: 'grid' | 'rows' | 'columns' | 'autoGrid';
    minimizedPosition?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    gridMinWidth?: string;
    disabled?: boolean; // Group-level disabled state
}

export const EnhancedJsonViewerGroup: React.FC<EnhancedJsonViewerGroupProps> = (
    {
        viewers,
        layout = 'autoGrid',
        minimizedPosition = 'top',
        className,
        gridMinWidth = '350px',
        disabled: groupDisabled = false,
    }) => {
    const viewersWithIds = useMemo(() => {
        return viewers.map((viewer, index) => {
            if (!viewer.id) {
                // Assign a unique id if it's missing
                return {...viewer, id: `viewer-${index}`};
            }
            return viewer;
        });
    }, [viewers]);

    const [minimizedStates, setMinimizedStates] = useState<Record<string, boolean>>({});

    const handleMinimizeChange = (id: string, isMinimized: boolean) => {
        if (groupDisabled) return;
        setMinimizedStates((prev) => ({
            ...prev,
            [id]: isMinimized,
        }));
    };

    // Sort viewers into minimized and expanded
    const {minimizedViewers, expandedViewers} = viewersWithIds.reduce(
        (acc, viewer) => {
            if (minimizedStates[viewer.id] && !groupDisabled && !viewer.disabled) {
                acc.minimizedViewers.push(viewer);
            } else {
                acc.expandedViewers.push(viewer);
            }
            return acc;
        },
        {minimizedViewers: [], expandedViewers: []} as {
            minimizedViewers: typeof viewersWithIds;
            expandedViewers: typeof viewersWithIds;
        }
    );

    const layoutClasses = {
        grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1',
        autoGrid: 'grid gap-1',
        rows: 'flex flex-col gap-1',
        columns: 'flex flex-row gap-1 flex-wrap',
    };

    const minimizedAreaClasses = {
        top: 'flex flex-wrap gap-4 mb-2',
        bottom: 'flex flex-wrap gap-4 mt-2',
        left: 'flex flex-col gap-4 mr-4 w-60',
        right: 'flex flex-col gap-4 ml-2 w-60',
    };

    const getLayoutStyle = () => {
        if (layout === 'autoGrid') {
            return {
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}, 1fr))`,
            };
        }
        return {};
    };

    const isHorizontalMinimized =
        minimizedPosition === 'top' || minimizedPosition === 'bottom';

    const renderViewerComponent = (
        viewer: typeof viewersWithIds[0],
        isMinimized: boolean
    ) => (
        <motion.div
            key={`${viewer.id}-${isMinimized ? 'min' : 'exp'}`}
            layout
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.95}}
            transition={{type: 'spring', bounce: 0.2}}
        >
            <EnhancedJsonViewer
                {...viewer}
                disabled={groupDisabled || viewer.disabled}
                isMinimized={isMinimized}
                onMinimizeChange={(minimized) =>
                    handleMinimizeChange(viewer.id, minimized)
                }
                className={cn(viewer.className, groupDisabled && 'opacity-70')}
            />
        </motion.div>
    );

    return (
        <div
            className={cn(
                'flex',
                isHorizontalMinimized ? 'flex-col' : 'flex-row',
                groupDisabled && 'opacity-70',
                className
            )}
        >
            <AnimatePresence mode="popLayout">
                {(minimizedPosition === 'top' || minimizedPosition === 'left') &&
                    minimizedViewers.length > 0 &&
                    !groupDisabled && (
                        <div className={minimizedAreaClasses[minimizedPosition]}>
                            {minimizedViewers.map((viewer) =>
                                renderViewerComponent(viewer, true)
                            )}
                        </div>
                    )}

                <div
                    className={cn('flex-1', layoutClasses[layout])}
                    style={getLayoutStyle()}
                >
                    {expandedViewers.map((viewer) =>
                        renderViewerComponent(viewer, false)
                    )}
                </div>

                {(minimizedPosition === 'bottom' || minimizedPosition === 'right') &&
                    minimizedViewers.length > 0 &&
                    !groupDisabled && (
                        <div className={minimizedAreaClasses[minimizedPosition]}>
                            {minimizedViewers.map((viewer) =>
                                renderViewerComponent(viewer, true)
                            )}
                        </div>
                    )}
            </AnimatePresence>
        </div>
    );
};

export default FullJsonViewer;

/*

// Single viewer with minimize capability
<FullJsonViewer
    data={data}
    title="My JSON Data"
    allowMinimize={true}
/>

// Group of viewers
<JsonViewerGroup
    viewers={[
        { id: '1', data: data1, title: "First Dataset", allowMinimize: true },
        { id: '2', data: data2, title: "Second Dataset", allowMinimize: true },
        { id: '3', data: data3, title: "Third Dataset", allowMinimize: true }
    ]}
    layout="grid"
    minimizedPosition="top"
/>

*/


/* Docs:
JSON Viewer Component Usage:

Import:
import { JsonViewer, FullJsonViewer } from '@/components/ui/JsonViewer';

Basic Usage:
<JsonViewer data={yourJsonObject} />

Full Version with Title:
<FullJsonViewer data={yourJsonObject} title="Custom Title" />

Key Props:
- data: (required) Your JSON object to display
- initialExpanded: (optional) Boolean to set initial expand state
- maxHeight: (optional) String for max height (default: '400px')

Features:
- Expand/Collapse All buttons
- Copy to Clipboard functionality
- Syntax highlighting
- Animated expansions

Styling:
Uses Tailwind classes and our app's CSS variables for consistent theming.

Note: Ensure the JSON object is valid before passing to the component.
 */
