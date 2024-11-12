import React, {useState} from 'react';
import {motion, AnimatePresence} from 'framer-motion';
import {cn} from "@/lib/utils";
import {ChevronDown, ChevronRight, Edit, Save, X, Plus, Trash} from 'lucide-react';
import {Input} from "@/components/ui/input";
import {ValidationError} from "./types";

interface JsonEditorItemProps {
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
    readOnly?: boolean;
    index: number;
}

const JsonEditorItem: React.FC<JsonEditorItemProps> = (
    {
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
        readOnly,
        index,
    }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedKey, setEditedKey] = useState(keyName);
    const [editedValue, setEditedValue] = useState(() =>
        typeof value === 'object' ? '' : JSON.stringify(value)
    );

    const isObject = typeof value === 'object' && value !== null;
    const indent = depth * 12; // Reduced indentation

    const handleEdit = () => {
        if (readOnly) return;
        setIsEditing(true);
        setEditedKey(keyName);
        setEditedValue(typeof value === 'object' ? '' : JSON.stringify(value));
    };

    const handleSave = () => {
        try {
            const parsedValue = typeof value === 'object' ? value : JSON.parse(editedValue);
            onEdit(editedKey, parsedValue);
            setIsEditing(false);
        } catch (error) {
            console.error('Invalid JSON:', error);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditedKey(keyName);
        setEditedValue(typeof value === 'object' ? '' : JSON.stringify(value));
    };

    const getValueColor = (val: any) => {
        if (typeof val === 'string') return "text-emerald-600 dark:text-emerald-400";
        if (typeof val === 'number') return "text-blue-600 dark:text-blue-400";
        if (typeof val === 'boolean') return "text-amber-600 dark:text-amber-400";
        return "text-foreground";
    };

    const IconButton = ({
                            icon: Icon,
                            onClick,
                            color = "text-muted-foreground",
                            hoverColor = "hover:text-foreground"
                        }) => (
        <button
            onClick={onClick}
            className={cn(
                "p-0.5 rounded-sm transition-colors",
                color,
                hoverColor,
                "opacity-0 group-hover:opacity-100",
                readOnly && "hidden"
            )}
        >
            <Icon className="h-3.5 w-3.5"/>
        </button>
    );

    return (
        <div
            className={cn(
                "group text-sm",
                error && "bg-destructive/10 rounded-sm"
            )}
            style={{marginLeft: `${indent}px`}}
        >
            <div className="flex items-center py-0.5 hover:bg-muted/50 rounded-sm -ml-1 pl-1">
                {isObject && (
                    <button
                        onClick={onToggle}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                    >
                        {isExpanded ?
                         <ChevronDown className="h-3 w-3"/> :
                         <ChevronRight className="h-3 w-3"/>
                        }
                    </button>
                )}

                {isEditing ? (
                    <div className="flex items-center gap-1 flex-1">
                        {!lockKeys && (
                            <Input
                                value={editedKey}
                                onChange={e => setEditedKey(e.target.value)}
                                className="h-6 text-sm px-1 w-auto min-w-[60px]"
                            />
                        )}
                        {!isObject && (
                            <Input
                                value={editedValue}
                                onChange={e => setEditedValue(e.target.value)}
                                className="h-6 text-sm px-1 flex-1"
                            />
                        )}
                        <IconButton
                            icon={Save}
                            onClick={handleSave}
                            color="text-green-600 dark:text-green-400"
                            hoverColor="hover:text-green-700 dark:hover:text-green-300"
                        />
                        <IconButton
                            icon={X}
                            onClick={handleCancel}
                            color="text-red-600 dark:text-red-400"
                            hoverColor="hover:text-red-700 dark:hover:text-red-300"
                        />
                    </div>
                ) : (
                     <div className="flex items-center gap-1 flex-1">
                         <span className="font-medium">{keyName}</span>
                         <span>:</span>
                         {!isObject && (
                             <span
                                 className={cn(
                                     "cursor-text px-1 rounded-sm",
                                     getValueColor(value),
                                     !readOnly && "hover:bg-muted"
                                 )}
                                 onClick={handleEdit}
                             >
                {typeof value === 'string' ? `"${value}"` : String(value)}
              </span>
                         )}
                         <div className="flex items-center gap-0.5 ml-auto">
                             <IconButton
                                 icon={Edit}
                                 onClick={handleEdit}
                                 color="text-blue-600 dark:text-blue-400"
                                 hoverColor="hover:text-blue-700 dark:hover:text-blue-300"
                             />
                             <IconButton
                                 icon={Plus}
                                 onClick={() => onAdd("newKey", null, index + 1)}
                                 color="text-green-600 dark:text-green-400"
                                 hoverColor="hover:text-green-700 dark:hover:text-green-300"
                             />
                             <IconButton
                                 icon={Trash}
                                 onClick={onDelete}
                                 color="text-red-600 dark:text-red-400"
                                 hoverColor="hover:text-red-700 dark:hover:text-red-300"
                             />
                         </div>
                     </div>
                 )}
            </div>

            {error && (
                <div className="text-destructive text-xs mt-0.5 ml-4">{error.message}</div>
            )}

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
                                isExpanded={false}
                                onToggle={() => {
                                }}
                                onEdit={(newKey, newValue) => {
                                    const newObj = {...value};
                                    delete newObj[k];
                                    newObj[newKey] = newValue;
                                    onEdit(keyName, newObj);
                                }}
                                onAdd={(newKey, newValue, index) => {
                                    const entries = Object.entries(value);
                                    entries.splice(index, 0, [newKey, newValue]);
                                    onEdit(keyName, Object.fromEntries(entries));
                                }}
                                onDelete={() => {
                                    const newObj = {...value};
                                    delete newObj[k];
                                    onEdit(keyName, newObj);
                                }}
                                error={error}
                                lockKeys={lockKeys}
                                readOnly={readOnly}
                                index={i}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
};

export default JsonEditorItem;

/*

const JsonEditorItem: React.FC<JsonEditorItemProps> = (
    {
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
        readOnly,
        index
    }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedKey, setEditedKey] = useState(keyName);
    const [editedValue, setEditedValue] = useState(() =>
        typeof value === 'object' ? '' : String(value)
    );

    const handleSubmit = () => {
        if (readOnly) return;
        onEdit(editedKey,
            typeof value === 'object'
            ? value
            : tryParseValue(editedValue)
        );
        setIsEditing(false);
    };

    const tryParseValue = (val: string) => {
        try {
            return JSON.parse(val);
        } catch {
            return val;
        }
    };

    const isObject = typeof value === 'object' && value !== null;
    const indent = depth * 16;

    return (
        <div
            className={cn(
                "flex items-start text-sm",
                error && "bg-destructive/10"
            )}
            style={{paddingLeft: `${indent}px`}}
        >
            {isEditing ? (
                <div className="flex items-center space-x-1 py-0.5">
                    {!lockKeys && (
                        <input
                            value={editedKey}
                            onChange={e => setEditedKey(e.target.value)}
                            className="px-1 py-0.5 text-sm bg-muted rounded-sm w-auto"
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            autoFocus
                        />
                    )}
                    {!isObject && (
                        <>
                            <span>:</span>
                            <input
                                value={editedValue}
                                onChange={e => setEditedValue(e.target.value)}
                                className="px-1 py-0.5 text-sm bg-muted rounded-sm w-auto"
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                            />
                        </>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="text-primary hover:text-primary/80"
                    >
                        ✓
                    </button>
                    <button
                        onClick={() => setIsEditing(false)}
                        className="text-destructive hover:text-destructive/80"
                    >
                        ✕
                    </button>
                </div>
            ) : (
                 <div className="flex items-center space-x-1 py-0.5 group">
                     {isObject && (
                         <button
                             onClick={onToggle}
                             className="w-4 text-center"
                         >
                             {isExpanded ? '▼' : '▶'}
                         </button>
                     )}
                     <span
                         className={cn(
                             "cursor-text",
                             !readOnly && "hover:bg-muted px-1 rounded-sm"
                         )}
                         onClick={() => !readOnly && setIsEditing(true)}
                     >
            {keyName}
          </span>
                     <span>:</span>
                     {!isObject && (
                         <span
                             className={cn(
                                 "cursor-text",
                                 !readOnly && "hover:bg-muted px-1 rounded-sm"
                             )}
                             onClick={() => !readOnly && setIsEditing(true)}
                         >
              {typeof value === 'string' ? `"${value}"` : String(value)}
            </span>
                     )}
                     {!readOnly && (
                         <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                                 onClick={onDelete}
                                 className="text-destructive hover:text-destructive/80 px-1"
                             >
                                 ✕
                             </button>
                         </div>
                     )}
                 </div>
             )}
            {isObject && isExpanded && (
                <div className="w-full">
                    {Object.entries(value).map(([k, v], i) => (
                        <JsonEditorItem
                            key={k}
                            keyName={k}
                            value={v}
                            depth={depth + 1}
                            isExpanded={false}
                            onToggle={() => {
                            }}
                            onEdit={(newKey, newValue) => {
                                const newObj = {...value};
                                delete newObj[k];
                                newObj[newKey] = newValue;
                                onEdit(keyName, newObj);
                            }}
                            onAdd={(newKey, newValue, index) => {
                                const entries = Object.entries(value);
                                entries.splice(index, 0, [newKey, newValue]);
                                onEdit(keyName, Object.fromEntries(entries));
                            }}
                            onDelete={() => {
                                const newObj = {...value};
                                delete newObj[k];
                                onEdit(keyName, newObj);
                            }}
                            error={error}
                            lockKeys={lockKeys}
                            readOnly={readOnly}
                            index={i}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
*/
