'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';

interface JsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object;
    initialExpanded?: boolean;
    maxHeight?: string;
}

const JsonViewerItem: React.FC<{
    keyName: string;
    value: any;
    depth: number;
    isExpanded: boolean;
    onToggle: () => void;
}> = ({
          keyName,
          value,
          depth,
          isExpanded,
          onToggle
      }) => {
    const isObject = typeof value === 'object' && value !== null;

    return (
        <div className={cn("ml-4", depth === 0 && "ml-0")}>
            <div className="flex items-center">
                {isObject && (
                    <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={onToggle}>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                )}
                <span className="font-semibold text-foreground">{keyName}: </span>
                {!isObject && (
                    <span className={cn(
                        "ml-2",
                        typeof value === 'string' && "text-success",
                        typeof value === 'number' && "text-info",
                        typeof value === 'boolean' && "text-warning"
                    )}>
                        {JSON.stringify(value)}
                    </span>
                )}
            </div>
            {isObject && isExpanded && (
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {Object.entries(value).map(([k, v]) => (
                            <JsonViewerItem
                                key={k}
                                keyName={k}
                                value={v}
                                depth={depth + 1}
                                isExpanded={isExpanded}
                                onToggle={onToggle}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};

export const JsonViewer: React.FC<JsonViewerProps> = ({
                                                          data,
                                                          className,
                                                          initialExpanded = false,
                                                          maxHeight = '400px',
                                                          ...props
                                                      }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(data, null, 2));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const toggleExpand = useCallback((key: string) => {
        setExpandedKeys(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    }, []);

    const expandAll = () => {
        const allKeys = getAllKeys(data);
        setExpandedKeys(new Set(allKeys));
    };

    const collapseAll = () => {
        setExpandedKeys(new Set());
    };

    const getAllKeys = (obj: any): string[] => {
        let keys: string[] = [];
        for (const key in obj) {
            keys.push(key);
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                keys = keys.concat(getAllKeys(obj[key]).map(k => `${key}.${k}`));
            }
        }
        return keys;
    };

    return (
        <div
            className={cn(
                "relative bg-background text-foreground p-4 rounded-md overflow-auto",
                className
            )}
            style={{ maxHeight }}
            {...props}
        >
            <div className="flex justify-end space-x-2 mb-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={expandAll}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                    Expand All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={collapseAll}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                    Collapse All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <Copy className="h-4 w-4 mr-2" />
                    {isCopied ? 'Copied!' : 'Copy'}
                </Button>
            </div>
            {Object.entries(data).map(([key, value]) => (
                <JsonViewerItem
                    key={key}
                    keyName={key}
                    value={value}
                    depth={0}
                    isExpanded={expandedKeys.has(key)}
                    onToggle={() => toggleExpand(key)}
                />
            ))}
        </div>
    );
};

interface FullJsonViewerProps extends Omit<JsonViewerProps, 'className'> {
    title?: string;
    className?: string;
}

export const FullJsonViewer: React.FC<FullJsonViewerProps> = ({
                                                                  data,
                                                                  title = "JSON Data",
                                                                  className,
                                                                  ...props
                                                              }) => {
    return (
        <Card className={cn("p-4 bg-card", className)}>
            <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
            <JsonViewer data={data} {...props} />
        </Card>
    );
};

export default FullJsonViewer;



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
