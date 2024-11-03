// components/ui/JsonComponents/JsonEditor.tsx

'use client';

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {Copy, ChevronDown, ChevronRight, Plus, Trash, Save, X, Edit} from 'lucide-react';
import jsonlint from 'jsonlint-mod';

export interface EditableJsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object | string | null;
    onChange: (newData: object | string) => void;
    onFormat?: () => void;
    initialExpanded?: boolean;
    maxHeight?: string;
    validateDelay?: number;
    lockKeys?: boolean;
    defaultEnhancedMode?: boolean;
}

interface ValidationError {
    line: number;
    column: number;
    message: string;
}

const JsonEditorItem: React.FC<{
    keyName: string;
    value: any;
    depth: number;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: (newKey: string, newValue: any) => void;
    onAdd: (newKey: string, newValue: any, index: number) => void;
    onDelete: () => void;
    error?: ValidationError;
    lockKeys?: boolean;
    index: number;
}> = ({
          keyName,
          value,
          depth,
          isExpanded,
          onToggle,
          onEdit,
          onAdd,
          onDelete,
          error,
          lockKeys,
          index,
      }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedKey, setEditedKey] = useState(keyName);
    const [editedValue, setEditedValue] = useState(JSON.stringify(value));
    const isObject = typeof value === 'object' && value !== null;

    const handleEdit = () => {
        setIsEditing(true);
        setEditedKey(keyName);
        setEditedValue(JSON.stringify(value));
    };

    const handleSave = () => {
        try {
            const parsedValue = JSON.parse(editedValue);
            onEdit(editedKey, parsedValue);
            setIsEditing(false);
        } catch (error) {
            console.error('Invalid JSON:', error);
            // You might want to show an error message to the user here
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedKey(keyName);
        setEditedValue(JSON.stringify(value));
    };

    const handleAdd = () => {
        onAdd("newKey", null, index + 1);
    };

    return (
        <div className={cn("ml-4", depth === 0 && "ml-0", error && "bg-red-100 p-1 rounded")}>
            <div className="flex items-center">
                {isObject && (
                    <Button variant="ghost" size="sm" className="p-0 h-auto" onClick={onToggle}>
                        {isExpanded ? <ChevronDown className="h-3 w-3"/> : <ChevronRight className="h-3 w-3"/>}
                    </Button>
                )}
                {!isEditing ? (
                    <>
                        <span className="font-semibold text-foreground">{keyName}: </span>
                        {!isObject && (
                            <span
                                className={cn(
                                    "ml-2 cursor-pointer",
                                    typeof value === 'string' && "text-success",
                                    typeof value === 'number' && "text-info",
                                    typeof value === 'boolean' && "text-warning"
                                )}
                                onClick={handleEdit}
                            >
                        {JSON.stringify(value)}
                    </span>
                        )}
                        <Button size="xs" variant="ghost" onClick={handleEdit}><Edit className="h-3 w-3"/></Button>
                    </>
                ) : (
                    <div className="flex items-center ml-2">
                        {!lockKeys && (
                            <Input
                                value={editedKey}
                                onChange={(e) => setEditedKey(e.target.value)}
                                className="mr-2 w-1/3"
                            />
                        )}
                        <Input
                            value={editedValue}
                            onChange={(e) => setEditedValue(e.target.value)}
                            className="mr-2"
                        />
                        <Button size="xs" onClick={handleSave}><Save className="h-3 w-3"/></Button>
                        <Button size="xs" variant="ghost" onClick={handleCancel}><X className="h-3 w-3"/></Button>
                    </div>
                )}
                <Button size="xs" variant="ghost" onClick={handleAdd}><Plus className="h-3 w-3"/></Button>
                <Button size="xs" variant="ghost" onClick={onDelete}><Trash className="h-3 w-3"/></Button>
            </div>
            {error && <div className="text-red-500 text-sm mt-1">{error.message}</div>}
            {isObject && isExpanded && (
                <AnimatePresence>
                    <motion.div
                        initial={{opacity: 0, height: 0}}
                        animate={{opacity: 1, height: 'auto'}}
                        exit={{opacity: 0, height: 0}}
                        transition={{duration: 0.2}}
                    >
                        {Object.entries(value).map(([k, v], i) => (
                            <JsonEditorItem
                                key={k}
                                keyName={k}
                                value={v}
                                depth={depth + 1}
                                isExpanded={isExpanded}
                                onToggle={onToggle}
                                onEdit={(newKey, newValue) => {
                                    const newObj = {...value};
                                    delete newObj[k];
                                    newObj[newKey] = newValue;
                                    onEdit(keyName, newObj);
                                }}
                                onAdd={(newKey, newValue, index) => {
                                    const entries = Object.entries(value);
                                    entries.splice(index, 0, [newKey, newValue]);
                                    const newObj = Object.fromEntries(entries);
                                    onEdit(keyName, newObj);
                                }}
                                onDelete={() => {
                                    const newObj = {...value};
                                    delete newObj[k];
                                    onEdit(keyName, newObj);
                                }}
                                lockKeys={lockKeys}
                                index={i}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};

export const EditableJsonViewer: React.FC<EditableJsonViewerProps> = (
    {
        data,
        onChange,
        onFormat,
        className,
        initialExpanded = false,
        maxHeight = '400px',
        validateDelay = 300,
        lockKeys = false,
        defaultEnhancedMode = true,
        ...props
    }) => {
    const [parsedData, setParsedData] = useState<object>({});
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
    const [isCopied, setIsCopied] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isEnhancedMode, setIsEnhancedMode] = useState(defaultEnhancedMode);
    const [basicJsonText, setBasicJsonText] = useState('');

    const debouncedValidate = useMemo(() => {
        let timeoutId: NodeJS.Timeout;
        return (jsonString: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                try {
                    jsonlint.parse(jsonString);
                    setValidationErrors([]);
                } catch (error: any) {
                    const match = error.message.match(/line (\d+) column (\d+)/);
                    if (match) {
                        setValidationErrors([{
                            line: parseInt(match[1], 10),
                            column: parseInt(match[2], 10),
                            message: error.message
                        }]);
                    }
                }
            }, validateDelay);
        };
    }, [validateDelay]);

    useEffect(() => {
        const initializeData = () => {
            // Check if data is valid or set to empty object
            if (data === null || data === undefined) {
                setParsedData({});
                setBasicJsonText('');
                return;
            }

            if (typeof data === 'string') {
                setBasicJsonText(data);
                try {
                    const parsed = JSON.parse(data);
                    setParsedData(parsed);
                    debouncedValidate(data);
                } catch (error) {
                    console.error('Invalid JSON string:', error);
                    setParsedData({});
                    debouncedValidate(data);
                }
            } else {
                const stringified = JSON.stringify(data, null, 2);
                setBasicJsonText(stringified);
                setParsedData(data);
                debouncedValidate(stringified);
            }
        };

        initializeData();
    }, [data, debouncedValidate]);


    const handleChange = (newData: object) => {
        setParsedData(newData);
        const stringifiedData = JSON.stringify(newData, null, 2);
        setBasicJsonText(stringifiedData);
        onChange(typeof data === 'string' ? stringifiedData : newData);
        debouncedValidate(stringifiedData);
    };

    const handleBasicJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setBasicJsonText(newValue);
        debouncedValidate(newValue);
        try {
            const parsed = JSON.parse(newValue);
            setParsedData(parsed);
            onChange(typeof data === 'string' ? newValue : parsed);
        } catch (error) {
            // If it's not valid JSON, we don't update parsedData
            console.error('Invalid JSON:', error);
        }
    };

    const toggleMode = () => {
        if (isEnhancedMode) {
            setBasicJsonText(JSON.stringify(parsedData, null, 2));
        } else {
            try {
                const parsed = JSON.parse(basicJsonText);
                setParsedData(parsed);
                onChange(parsed);
            } catch (error) {
                console.error('Invalid JSON:', error);
            }
        }
        setIsEnhancedMode(!isEnhancedMode);
    };


    const copyToClipboard = () => {
        const stringifiedData = JSON.stringify(parsedData, null, 2);
        navigator.clipboard.writeText(stringifiedData);
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
        const allKeys = getAllKeys(parsedData);
        setExpandedKeys(new Set(allKeys));
        const stringifiedData = JSON.stringify(parsedData, null, 2);
        debouncedValidate(stringifiedData);
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
            style={{maxHeight}}
            {...props}
        >
            <div className="flex justify-end space-x-2 mb-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMode}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {isEnhancedMode ? 'Basic Mode' : 'Enhanced Mode'}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                >
                    <Copy className="h-3 w-3 mr-2"/>
                    {isCopied ? 'Copied!' : 'Copy'}
                </Button>
                {isEnhancedMode && (
                    <>
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
                    </>
                )}
                {onFormat && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onFormat}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                        Format
                    </Button>
                )}
            </div>
            {isEnhancedMode ? (
                Object.entries(parsedData).length > 0 ? (
                    Object.entries(parsedData).map(([key, value], index) => (
                        <JsonEditorItem
                            key={key}
                            keyName={key}
                            value={value}
                            depth={0}
                            isExpanded={expandedKeys.has(key)}
                            onToggle={() => toggleExpand(key)}
                            onEdit={(newKey, newValue) => {
                                const newData = {...parsedData};
                                delete newData[key];
                                newData[newKey] = newValue;
                                handleChange(newData);
                            }}
                            onAdd={(newKey, newValue, index) => {
                                const entries = Object.entries(parsedData);
                                entries.splice(index, 0, [newKey, newValue]);
                                const newData = Object.fromEntries(entries);
                                handleChange(newData);
                            }}
                            onDelete={() => {
                                const newData = {...parsedData};
                                delete newData[key];
                                handleChange(newData);
                            }}
                            error={validationErrors.find(error => error.line === index + 1)}
                            lockKeys={lockKeys}
                            index={index}
                        />
                    ))
                ) : (
                    <div className="text-gray-500">No data available</div>
                )
            ) : (
                <Textarea
                    value={basicJsonText}
                    onChange={handleBasicJsonChange}
                    className="w-full h-64 font-mono"
                />
            )}
            {validationErrors.length > 0 && (
                <div className="mt-4 p-2 bg-red-100 rounded">
                    <h4 className="text-red-700 font-semibold">Validation Errors:</h4>
                    <ul className="list-disc pl-5">
                        {validationErrors.map((error, index) => (
                            <li key={index} className="text-red-600">
                                Line {error.line}, Column {error.column}: {error.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export const FullEditableJsonViewer: React.FC<EditableJsonViewerProps & { title?: string }> = (
    {
        data,
        onChange,
        onFormat,
        title = "JSON Editor",
        ...props
    }) => {
    return (
        <Card className="p-4 bg-card">
            <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
            <EditableJsonViewer data={data} onChange={onChange} onFormat={onFormat} {...props} />
        </Card>
    );
};

export default FullEditableJsonViewer;
