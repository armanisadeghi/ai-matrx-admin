// components/ui/JsonComponents/JsonEditor.tsx
'use client';

import React, {useState, useCallback, useEffect, useMemo} from 'react';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {cn} from '@/lib/utils';
import {motion, AnimatePresence} from 'framer-motion';
import {
    Copy,
    Save,
    Maximize2,
    RotateCcw,
    Check,
    Minimize2, FileText, Edit3
} from 'lucide-react';
import jsonlint from 'jsonlint-mod';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '../tooltip';
import {EditableJsonViewerProps} from "@/components/ui/JsonComponents/types";
import {ValidationError} from "./types";
import JsonEditorItem from './JsonEditorItem';


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
        readOnly = false,
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

    const IconButton = ({icon: Icon, tooltip, onClick, className = ""}) => (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={onClick}
                        className={cn(
                            "p-1 hover:bg-muted rounded-sm transition-colors",
                            className
                        )}
                    >
                        <Icon className="h-4 w-4"/>
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltip}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );

    return (
        <div
            className={cn(
                "relative bg-background text-foreground p-2 rounded-md overflow-auto",
                className
            )}
            style={{maxHeight}}
            {...props}
        >
            <div className="flex justify-end space-x-1 mb-2">
                <IconButton
                    icon={isEnhancedMode ? FileText : Edit3}
                    tooltip={isEnhancedMode ? "Switch to Basic Mode" : "Switch to Enhanced Mode"}
                    onClick={toggleMode}
                />
                <IconButton
                    icon={Copy}
                    tooltip={isCopied ? "Copied!" : "Copy JSON"}
                    onClick={copyToClipboard}
                />
                {isEnhancedMode && (
                    <>
                        <IconButton
                            icon={Maximize2}
                            tooltip="Expand All"
                            onClick={expandAll}
                        />
                        <IconButton
                            icon={Minimize2}
                            tooltip="Collapse All"
                            onClick={collapseAll}
                        />
                    </>
                )}
                {!readOnly && onFormat && (
                    <IconButton
                        icon={FileText}
                        tooltip="Format JSON"
                        onClick={onFormat}
                    />
                )}
            </div>

            {isEnhancedMode ? (
                <div className="space-y-0.5">
                    {Object.entries(parsedData).length > 0 ? (
                        Object.entries(parsedData).map(([key, value], index) => (
                            <JsonEditorItem
                                key={key}
                                keyName={key}
                                value={value}
                                depth={0}
                                isExpanded={expandedKeys.has(key)}
                                onToggle={() => toggleExpand(key)}
                                onEdit={(newKey, newValue) => {
                                    if (readOnly) return;
                                    const newData = {...parsedData};
                                    delete newData[key];
                                    newData[newKey] = newValue;
                                    handleChange(newData);
                                }}
                                onAdd={(newKey, newValue, index) => {
                                    if (readOnly) return;
                                    const entries = Object.entries(parsedData);
                                    entries.splice(index, 0, [newKey, newValue]);
                                    const newData = Object.fromEntries(entries);
                                    handleChange(newData);
                                }}
                                onDelete={() => {
                                    if (readOnly) return;
                                    const newData = {...parsedData};
                                    delete newData[key];
                                    handleChange(newData);
                                }}
                                error={validationErrors.find(error => error.line === index + 1)}
                                lockKeys={lockKeys}
                                readOnly={readOnly}
                                index={index}
                            />
                        ))
                    ) : (
                         <div className="text-muted-foreground text-sm">No data available</div>
                     )}
                </div>
            ) : (
                 <Textarea
                     value={basicJsonText}
                     onChange={handleBasicJsonChange}
                     className="w-full h-64 font-mono text-sm"
                     readOnly={readOnly}
                 />
             )}

            {validationErrors.length > 0 && (
                <div className="mt-2 p-1.5 bg-destructive/10 rounded text-sm">
                    <h4 className="text-destructive font-medium">Validation Errors:</h4>
                    <ul className="list-disc pl-4 mt-1">
                        {validationErrors.map((error, index) => (
                            <li key={index} className="text-destructive">
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
        className,
        ...props
    }) => {
    return (
        <Card className={cn("bg-card", className)}>
            <div className="px-3 py-2 border-b">
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
            </div>
            <div className="p-3">
                <EditableJsonViewer
                    data={data}
                    onChange={onChange}
                    onFormat={onFormat}
                    {...props}
                />
            </div>
        </Card>
    );
};


export interface EnhancedEditableJsonViewerProps extends React.HTMLAttributes<HTMLDivElement> {
    data: object | string;
    title?: string;
    onSave?: (data: object) => void;
    onChange?: (data: object) => void;
    className?: string;
    allowMinimize?: boolean;
    isMinimized?: boolean;
    onMinimizeChange?: (isMinimized: boolean) => void;
    id?: string;
    readOnly?: boolean;
    hideHeader?: boolean;
}

export const EnhancedEditableJsonViewer: React.FC<EnhancedEditableJsonViewerProps> = (
    {
        data,
        title,
        onSave,
        onChange,
        className,
        allowMinimize = false,
        isMinimized: controlledIsMinimized,
        onMinimizeChange,
        id,
        readOnly = false,
        hideHeader = false,
        ...props
    }) => {
    const [localIsMinimized, setLocalIsMinimized] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [localData, setLocalData] = useState(data);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const isMinimized = controlledIsMinimized ?? localIsMinimized;

    useEffect(() => {
        setLocalData(data);
        setHasChanges(false);
    }, [data]);

    const handleMinimizeToggle = () => {
        const newValue = !isMinimized;
        setLocalIsMinimized(newValue);
        onMinimizeChange?.(newValue);
    };

    const handleChange = (newData: object) => {
        setLocalData(newData);
        setHasChanges(true);
        onChange?.(newData);
    };

    const handleSave = async () => {
        if (!hasChanges) return;

        setSaveStatus('saving');
        try {
            const dataToSave = typeof localData === 'string'
                               ? (localData.trim().startsWith('{') || localData.trim().startsWith('[')
                                  ? JSON.parse(localData)
                                  : localData)
                               : localData;

            await onSave?.(dataToSave);
            setSaveStatus('saved');
            setHasChanges(false);
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Save error:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleReset = () => {
        setLocalData(data);
        setHasChanges(false);
    };

    const renderEditorContent = () => (
        <EditableJsonViewer
            data={localData}
            onChange={handleChange}
            readOnly={readOnly}
            title={hideHeader ? title : undefined} // Pass title only if header is hidden
            {...props}
        />
    );

    const minimizedContent = (
        <motion.div
            key="minimized"
            initial={{opacity: 0, scale: 0.8}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.8}}
            className={cn(
                "flex items-center gap-2 bg-card rounded-full px-3 py-1.5 shadow-sm border cursor-pointer",
                hasChanges && "border-orange-500",
                readOnly && "border-muted"
            )}
            onClick={handleMinimizeToggle}
        >
            <span className="text-sm font-medium truncate max-w-[200px]">{title}</span>
            {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-orange-500"/>}
            {readOnly && <span className="text-xs text-muted-foreground">(Read Only)</span>}
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground"/>
        </motion.div>
    );

    const expandedContent = (
        <motion.div
            key="expanded"
            initial={{opacity: 0, scale: 0.95}}
            animate={{opacity: 1, scale: 1}}
            exit={{opacity: 0, scale: 0.95}}
        >
            <Card className="bg-card">
                {!hideHeader && (
                    <div className="px-3 py-2 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {readOnly && (
                                <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                                    Read Only
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            {!readOnly && hasChanges && (
                                <>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleReset}
                                        className="h-7 px-2 text-xs"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1"/>
                                        Reset
                                    </Button>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={handleSave}
                                        className="h-7 px-2 text-xs"
                                        disabled={saveStatus === 'saving'}
                                    >
                                        {saveStatus === 'saving' ? (
                                            <>Saving...</>
                                        ) : saveStatus === 'saved' ? (
                                            <><Check className="h-3.5 w-3.5 mr-1"/> Saved</>
                                        ) : (
                                                <><Save className="h-3.5 w-3.5 mr-1"/> Save</>
                                            )}
                                    </Button>
                                </>
                            )}
                            {allowMinimize && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleMinimizeToggle}
                                    className="h-7 w-7 p-0"
                                >
                                    <Minimize2 className="h-3.5 w-3.5"/>
                                </Button>
                            )}
                        </div>
                    </div>
                )}
                <div className={cn("p-3", hideHeader && "pt-0")}>
                    {renderEditorContent()}
                </div>
            </Card>
        </motion.div>
    );

    return (
        <motion.div
            layout
            initial={false}
            className={cn("relative", className)}
            transition={{type: "spring", bounce: 0.2, duration: 0.3}}
        >
            <AnimatePresence mode="wait">
                {isMinimized ? minimizedContent : expandedContent}
            </AnimatePresence>
        </motion.div>
    );
};


export default FullEditableJsonViewer;
