'use client';

import React, {useState, useCallback} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {Copy, ChevronDown, ChevronRight, Plus, Minus} from 'lucide-react';

interface MiniEditableJsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object | string;
    initialExpanded?: boolean;
    maxHeight?: string;
}

const MiniJsonViewerItem: React.FC<{
    keyName: string;
    value: any;
    depth: number;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: (newValue: any) => void;
    onDelete: () => void;
    onAdd: () => void;
    onNest: () => void;
    onUnnest: () => void;
}> = ({
          keyName,
          value,
          depth,
          isExpanded,
          onToggle,
          onEdit,
          onDelete,
          onAdd,
          onNest,
          onUnnest
      }) => {
    const isObject = typeof value === 'object' && value !== null;
    const isArray = Array.isArray(value);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onEdit(isArray ? newValue.split(',').map(v => v.trim()) : newValue);
    };

    return (
        <div className={cn("ml-4", depth === 0 && "ml-0")}>
            <div className="flex items-center">
                {isObject && (
                    <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={onToggle}>
                        {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                    </Button>
                )}
                <input
                    type="text"
                    value={keyName}
                    onChange={(e) => onEdit(e.target.value)}
                    className="border-b border-gray-300 focus:outline-none focus:border-blue-500"
                />
                <span className="font-semibold text-foreground">: </span>
                {isObject ? (
                    <span className="text-success">Object</span>
                ) : isArray ? (
                    <span className="text-info">Array</span>
                ) : (
                    <input
                        type="text"
                        value={value}
                        onChange={handleChange}
                        className={cn(
                            "ml-2 border-b border-gray-300 focus:outline-none focus:border-blue-500",
                            typeof value === 'string' && "text-success",
                            typeof value === 'number' && "text-info",
                            typeof value === 'boolean' && "text-warning"
                        )}
                    />
                )}
                <Button variant="ghost" size="sm" onClick={onAdd}>
                    <Plus className="h-4 w-4"/>
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete}>
                    <Minus className="h-4 w-4"/>
                </Button>
                {isObject && (
                    <Button variant="ghost" size="sm" onClick={onNest}>
                        Nest
                    </Button>
                )}
                {isObject && (
                    <Button variant="ghost" size="sm" onClick={onUnnest}>
                        Unnest
                    </Button>
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
                            <MiniJsonViewerItem
                                key={k}
                                keyName={k}
                                value={v}
                                depth={depth + 1}
                                isExpanded={isExpanded}
                                onToggle={onToggle}
                                onEdit={(newValue) => onEdit({...value, [k]: newValue})}
                                onDelete={() => onEdit({...value, [k]: undefined})}
                                onAdd={() => onEdit({...value, [k]: {...value[k], newKey: ''}})}
                                onNest={() => onEdit({...value, [k]: {...value[k], nestedKey: {}}})}
                                onUnnest={() => onEdit({...value, [k]: {...value[k], unNestedKey: value[k]}})}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};

export const MiniEditableJsonViewer: React.FC<MiniEditableJsonViewerProps> = (
    {
        data,
        className,
        initialExpanded = false,
        maxHeight = '400px',
        ...props
    }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [jsonData, setJsonData] = useState<any>(typeof data === 'string' ? JSON.parse(data) : data);
    const [error, setError] = useState<string | null>(null);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
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
        const allKeys = getAllKeys(jsonData);
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

    const handleEdit = (newData: any) => {
        try {
            setJsonData(newData);
            setError(null);
        } catch (err) {
            setError('Invalid JSON format');
        }
    };

    return (
        <div
            className={cn(
                "relative bg-background text-foreground p-4 rounded-md overflow-auto",
                className
            )}
            style={{maxHeight}}
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
                    <Copy className="h-4 w-4 mr-2"/>
                    {isCopied ? 'Copied!' : 'Copy'}
                </Button>
            </div>
            {error && <div className="text-red-500">{error}</div>}
            <MiniJsonViewerItem
                key="root"
                keyName="Root"
                value={jsonData}
                depth={0}
                isExpanded={initialExpanded}
                onToggle={() => toggleExpand('root')}
                onEdit={handleEdit}
                onDelete={() => handleEdit({})}
                onAdd={() => handleEdit({...jsonData, newKey: ''})}
                onNest={() => handleEdit({...jsonData, nestedKey: {}})}
                onUnnest={() => handleEdit({...jsonData, unNestedKey: jsonData})}
            />
        </div>
    );
};

interface MiniFullEditableJsonViewerProps extends Omit<MiniEditableJsonViewerProps, 'className'> {
    title?: string;
    className?: string;
}

export const MiniFullEditableJsonViewer: React.FC<MiniFullEditableJsonViewerProps> = (
    {
        data,
        title = "Editable JSON Data",
        className,
        ...props
    }) => {
    return (
        <Card className={cn("p-4 bg-card", className)}>
            <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
            <MiniEditableJsonViewer data={data} {...props} />
        </Card>
    );
};

export default MiniFullEditableJsonViewer;
