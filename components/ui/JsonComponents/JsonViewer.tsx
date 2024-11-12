'use client';

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {Copy, ChevronDown, ChevronRight, Minimize2, Maximize2} from 'lucide-react';

interface JsonViewerItemProps {
    keyName: string;
    value: any;
    depth: number;
    isExpanded: boolean;
    onToggle: () => void;
    disabled?: boolean;
    className?: string;
}

const JsonViewerItem: React.FC<JsonViewerItemProps> = ({
                                                           keyName,
                                                           value,
                                                           depth,
                                                           isExpanded,
                                                           onToggle,
                                                           disabled = false,
                                                           className
                                                       }) => {
    const isObject = typeof value === 'object' && value !== null;

    return (
        <div className={cn(
            "ml-4",
            depth === 0 && "ml-0",
            disabled && "opacity-70",
            className
        )}>
            <div className="flex items-center">
                {isObject && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "p-0 h-auto",
                            disabled && "cursor-not-allowed"
                        )}
                        onClick={disabled ? undefined : onToggle}
                        disabled={disabled}
                    >
                        {isExpanded ?
                         <ChevronDown className="h-4 w-4"/> :
                         <ChevronRight className="h-4 w-4"/>
                        }
                    </Button>
                )}
                <span className={cn(
                    "font-semibold",
                    disabled ? "text-muted-foreground" : "text-foreground"
                )}>
                    {keyName}:
                </span>
                {!isObject && (
                    <span className={cn(
                        "ml-2",
                        disabled && "text-muted-foreground",
                        !disabled && {
                            "text-success": typeof value === 'string',
                            "text-info": typeof value === 'number',
                            "text-warning": typeof value === 'boolean'
                        }
                    )}>
                        {JSON.stringify(value)}
                    </span>
                )}
            </div>
            {isObject && isExpanded && (
                <AnimatePresence>
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.2}}
                    >
                        {Object.entries(value).map(([k, v]) => (
                            <JsonViewerItem
                                key={k}
                                keyName={k}
                                value={v}
                                depth={depth + 1}
                                isExpanded={isExpanded}
                                onToggle={onToggle}
                                disabled={disabled}
                            />
                        ))}
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

    // Always parse the data, but handle empty/invalid cases internally
    const parsedData = useMemo(() => {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (error) {
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

    const toggleExpand = useCallback((key: string) => {
        if (disabled) return;
        setExpandedKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    }, [disabled]);

    const expandAll = useCallback(() => {
        if (disabled || !parsedData) return;
        const allKeys = getAllKeys(parsedData);
        setExpandedKeys(new Set(allKeys));
    }, [parsedData, disabled]);

    const collapseAll = useCallback(() => {
        if (disabled) return;
        setExpandedKeys(new Set());
    }, [disabled]);

    const getAllKeys = useCallback((obj: any): string[] => {
        let keys: string[] = [];
        for (const key in obj) {
            keys.push(key);
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                keys = keys.concat(getAllKeys(obj[key]).map(k => `${key}.${k}`));
            }
        }
        return keys;
    }, []);

    if (!parsedData) {
        return (
            <div className={cn(
                "bg-background text-muted-foreground p-2 rounded-md",
                className
            )}>
                No data available
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative bg-background text-foreground p-4 rounded-md overflow-auto",
                disabled && "opacity-70 pointer-events-none",
                className
            )}
            style={{maxHeight}}
            {...props}
        >
            {!hideControls && (
                <div className="flex justify-end space-x-2 mb-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={expandAll}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        disabled={disabled}
                    >
                        Expand All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={collapseAll}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                        disabled={disabled}
                    >
                        Collapse All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={disabled}
                    >
                        <Copy className="h-4 w-4 mr-2"/>
                        {isCopied ? 'Copied!' : 'Copy'}
                    </Button>
                </div>
            )}
            {Object.entries(parsedData).map(([key, value]) => (
                <JsonViewerItem
                    key={key}
                    keyName={key}
                    value={value}
                    depth={0}
                    isExpanded={expandedKeys.has(key)}
                    onToggle={() => toggleExpand(key)}
                    disabled={disabled}
                />
            ))}
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
                "p-4 bg-card",
                disabled && "opacity-70",
                className
            )}
        >
            {!hideTitle && (
                <h3 className={cn(
                    "text-lg font-semibold mb-2",
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

export const EnhancedJsonViewer: React.FC<EnhancedJsonViewerProps> = ({
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
                    <div className="flex justify-between items-center mb-2 p-4">
                        <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
                    </div>
                )}
                <div className={cn(!hideHeader && "px-4 pb-4")}>
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
            transition={{ type: "spring", bounce: 0.2 }}
        >
            <AnimatePresence mode="wait">
                {isMinimized ? (
                    <motion.div
                        key="minimized"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className={cn(
                            "flex items-center gap-2 bg-card rounded-full px-4 py-2 shadow-sm border",
                            !disabled && "cursor-pointer hover:bg-accent"
                        )}
                        onClick={handleMinimizeToggle}
                    >
                        <span className={cn(
                            "text-sm font-medium truncate max-w-[200px]",
                            disabled && "text-muted-foreground"
                        )}>
                            {title}
                        </span>
                        <Maximize2 className={cn(
                            "h-4 w-4",
                            disabled ? "text-muted-foreground" : "text-foreground"
                        )} />
                    </motion.div>
                ) : (
                     <motion.div
                         key="expanded"
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         exit={{ opacity: 0, scale: 0.95 }}
                     >
                         <Card className={cn("bg-card", !hideHeader && "p-4")}>
                             {!hideHeader && (
                                 <div className="flex justify-between items-center mb-2">
                                     <h3 className={cn(
                                         "text-lg font-semibold",
                                         disabled ? "text-muted-foreground" : "text-foreground"
                                     )}>
                                         {title}
                                     </h3>
                                     {allowMinimize && !disabled && (
                                         <Button
                                             variant="ghost"
                                             size="sm"
                                             onClick={handleMinimizeToggle}
                                             className="h-8 w-8 p-0"
                                         >
                                             <Minimize2 className="h-4 w-4" />
                                         </Button>
                                     )}
                                 </div>
                             )}
                             <div className={cn(!hideHeader && "mt-4")}>
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

export const EnhancedJsonViewerGroup: React.FC<EnhancedJsonViewerGroupProps> = ({
                                                                                    viewers,
                                                                                    layout = 'autoGrid',
                                                                                    minimizedPosition = 'top',
                                                                                    className,
                                                                                    gridMinWidth = '350px',
                                                                                    disabled: groupDisabled = false
                                                                                }) => {
    const [minimizedStates, setMinimizedStates] = useState<Record<string, boolean>>({});

    const handleMinimizeChange = (id: string, isMinimized: boolean) => {
        if (groupDisabled) return;
        setMinimizedStates(prev => ({
            ...prev,
            [id]: isMinimized
        }));
    };

    // Sort viewers into minimized and expanded
    const { minimizedViewers, expandedViewers } = viewers.reduce(
        (acc, viewer) => {
            if (minimizedStates[viewer.id] && !groupDisabled && !viewer.disabled) {
                acc.minimizedViewers.push(viewer);
            } else {
                acc.expandedViewers.push(viewer);
            }
            return acc;
        },
        { minimizedViewers: [], expandedViewers: [] } as {
            minimizedViewers: typeof viewers;
            expandedViewers: typeof viewers;
        }
    );

    const layoutClasses = {
        grid: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
        autoGrid: "grid gap-4",
        rows: "flex flex-col gap-4",
        columns: "flex flex-row gap-4 flex-wrap"
    };

    const minimizedAreaClasses = {
        top: "flex flex-wrap gap-2 mb-4",
        bottom: "flex flex-wrap gap-2 mt-4",
        left: "flex flex-col gap-2 mr-4 w-60",
        right: "flex flex-col gap-2 ml-4 w-60"
    };

    const getLayoutStyle = () => {
        if (layout === 'autoGrid') {
            return {
                gridTemplateColumns: `repeat(auto-fill, minmax(${gridMinWidth}, 1fr))`
            };
        }
        return {};
    };

    const isHorizontalMinimized = minimizedPosition === 'top' || minimizedPosition === 'bottom';

    const renderViewerComponent = (viewer: typeof viewers[0], isMinimized: boolean) => (
        <motion.div
            key={viewer.id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2 }}
        >
            <EnhancedJsonViewer
                {...viewer}
                disabled={groupDisabled || viewer.disabled}
                isMinimized={isMinimized}
                onMinimizeChange={(minimized) => handleMinimizeChange(viewer.id, minimized)}
                className={cn(
                    viewer.className,
                    groupDisabled && "opacity-70"
                )}
            />
        </motion.div>
    );

    return (
        <div className={cn(
            "flex",
            isHorizontalMinimized ? "flex-col" : "flex-row",
            groupDisabled && "opacity-70",
            className
        )}>
            <AnimatePresence mode="popLayout">
                {(minimizedPosition === 'top' || minimizedPosition === 'left') &&
                    minimizedViewers.length > 0 && !groupDisabled && (
                        <div className={minimizedAreaClasses[minimizedPosition]}>
                            {minimizedViewers.map(viewer =>
                                renderViewerComponent(viewer, true)
                            )}
                        </div>
                    )}

                <div
                    className={cn("flex-1", layoutClasses[layout])}
                    style={getLayoutStyle()}
                >
                    {expandedViewers.map(viewer =>
                        renderViewerComponent(viewer, false)
                    )}
                </div>

                {(minimizedPosition === 'bottom' || minimizedPosition === 'right') &&
                    minimizedViewers.length > 0 && !groupDisabled && (
                        <div className={minimizedAreaClasses[minimizedPosition]}>
                            {minimizedViewers.map(viewer =>
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
