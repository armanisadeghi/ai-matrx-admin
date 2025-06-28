import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

interface DataTypeInputProps {
    value: any;
    onChange: (value: any) => void;
    dataType: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const DataTypeInput: React.FC<DataTypeInputProps> = ({
    value,
    onChange,
    dataType,
    placeholder = "null",
    disabled = false,
    className = "",
}) => {
    const [listItems, setListItems] = useState<string[]>(() => {
        if (dataType === "list" && Array.isArray(value)) {
            return value.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item));
        }
        return [];
    });

    const [dictFields, setDictFields] = useState<{ key: string; value: string }[]>(() => {
        if (dataType === "dict" && value && typeof value === 'object' && !Array.isArray(value)) {
            return Object.entries(value).map(([key, val]) => ({
                key,
                value: typeof val === 'object' ? JSON.stringify(val) : String(val)
            }));
        }
        return [];
    });

    // Helper function to parse string values based on context
    const parseValue = (str: string) => {
        if (str.trim() === "") return null;
        
        // Try to parse as JSON first
        try {
            return JSON.parse(str);
        } catch {
            // If not valid JSON, return as string
            return str;
        }
    };

    // Handle text input (default fallback)
    const renderTextInput = () => (
        <Textarea
            value={
                value === null
                    ? ""
                    : typeof value === "object"
                    ? JSON.stringify(value, null, 2)
                    : String(value)
            }
            onChange={(e) => {
                const newValue = e.target.value;
                if (newValue.trim() === "") {
                    onChange(null);
                } else {
                    onChange(parseValue(newValue));
                }
            }}
            placeholder={placeholder}
            className={`min-h-[100px] resize-y text-sm font-mono ${className}`}
            rows={2}
            disabled={disabled}
        />
    );

    // Handle string/text input - using textarea to match original design
    const renderStringInput = () => (
        <Textarea
            value={value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder={placeholder}
            className={`min-h-[100px] resize-y text-sm font-mono ${className}`}
            rows={2}
            disabled={disabled}
        />
    );

    // Handle boolean input
    const renderBooleanInput = () => (
        <div className="flex items-center space-x-2">
            <Switch
                checked={Boolean(value)}
                onCheckedChange={(checked) => onChange(checked)}
                disabled={disabled}
            />
            <Label className="text-sm">
                {Boolean(value) ? "True" : "False"}
            </Label>
        </div>
    );

    // Handle number inputs
    const renderNumberInput = (type: "int" | "float") => (
        <Input
            type="number"
            step={type === "float" ? "any" : "1"}
            value={value === null ? "" : String(value)}
            onChange={(e) => {
                const val = e.target.value;
                if (val === "") {
                    onChange(null);
                } else {
                    const parsed = type === "int" ? parseInt(val, 10) : parseFloat(val);
                    onChange(isNaN(parsed) ? null : parsed);
                }
            }}
            placeholder={placeholder}
            className={`text-sm ${className}`}
            disabled={disabled}
        />
    );

    // Handle URL input
    const renderUrlInput = () => (
        <Input
            type="url"
            value={value === null ? "" : String(value)}
            onChange={(e) => onChange(e.target.value || null)}
            placeholder="https://example.com"
            className={`text-sm ${className}`}
            disabled={disabled}
        />
    );

    // Handle list input
    const renderListInput = () => {
        const updateList = () => {
            const parsedItems = listItems.map(item => parseValue(item)).filter(item => item !== null);
            onChange(parsedItems.length > 0 ? parsedItems : null);
        };

        const addItem = () => {
            setListItems([...listItems, ""]);
        };

        const removeItem = (index: number) => {
            const newItems = listItems.filter((_, i) => i !== index);
            setListItems(newItems);
            // Update the actual value
            const parsedItems = newItems.map(item => parseValue(item)).filter(item => item !== null);
            onChange(parsedItems.length > 0 ? parsedItems : null);
        };

        const updateItem = (index: number, newValue: string) => {
            const newItems = [...listItems];
            newItems[index] = newValue;
            setListItems(newItems);
            updateList();
        };

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">List Items</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                        disabled={disabled}
                        className="h-8 px-2"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {listItems.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2 border border-dashed rounded">
                        No items. Click + to add items.
                    </div>
                ) : (
                    listItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={item}
                                onChange={(e) => updateItem(index, e.target.value)}
                                placeholder="Enter item value"
                                className="text-sm font-mono"
                                disabled={disabled}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeItem(index)}
                                disabled={disabled}
                                className="h-8 px-2"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        );
    };

    // Handle dictionary/object input
    const renderDictInput = () => {
        const updateDict = () => {
            const obj = {};
            dictFields.forEach(({ key, value: val }) => {
                if (key.trim() !== "") {
                    obj[key] = parseValue(val);
                }
            });
            onChange(Object.keys(obj).length > 0 ? obj : null);
        };

        const addField = () => {
            setDictFields([...dictFields, { key: "", value: "" }]);
        };

        const removeField = (index: number) => {
            const newFields = dictFields.filter((_, i) => i !== index);
            setDictFields(newFields);
            // Update the actual value
            const obj = {};
            newFields.forEach(({ key, value: val }) => {
                if (key.trim() !== "") {
                    obj[key] = parseValue(val);
                }
            });
            onChange(Object.keys(obj).length > 0 ? obj : null);
        };

        const updateField = (index: number, field: "key" | "value", newValue: string) => {
            const newFields = [...dictFields];
            newFields[index][field] = newValue;
            setDictFields(newFields);
            updateDict();
        };

        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Object Fields</Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addField}
                        disabled={disabled}
                        className="h-8 px-2"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {dictFields.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-2 border border-dashed rounded">
                        No fields. Click + to add key-value pairs.
                    </div>
                ) : (
                    dictFields.map((field, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Input
                                value={field.key}
                                onChange={(e) => updateField(index, "key", e.target.value)}
                                placeholder="Key"
                                className="text-sm font-mono flex-1"
                                disabled={disabled}
                            />
                            <Input
                                value={field.value}
                                onChange={(e) => updateField(index, "value", e.target.value)}
                                placeholder="Value"
                                className="text-sm font-mono flex-1"
                                disabled={disabled}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeField(index)}
                                disabled={disabled}
                                className="h-8 px-2"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        );
    };

    // Main render logic based on data type
    const renderInput = () => {
        switch (dataType) {
            case "str":
                return renderStringInput();
            case "bool":
                return renderBooleanInput();
            case "int":
                return renderNumberInput("int");
            case "float":
                return renderNumberInput("float");
            case "url":
                return renderUrlInput();
            case "list":
                return renderListInput();
            case "dict":
                return renderDictInput();
            case "unknown":
            default:
                return renderTextInput();
        }
    };

    return (
        <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Current Value</label>
            {renderInput()}
        </div>
    );
};

export default DataTypeInput; 