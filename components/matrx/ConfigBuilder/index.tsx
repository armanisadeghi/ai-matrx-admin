"use client";
import React, { useState, useRef } from "react";
import { Inter } from "next/font/google";
import { AlertCircle, AlignLeft } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ConfigJSONViewer from "./ConfigJSONViewer";
import { Label, RadioGroup, RadioGroupItem } from "@/components/ui";
import { cn } from "@/lib/utils";
const inter = Inter({
    subsets: ["latin"],
    weight: ["200", "300", "400", "500"],
    display: "swap",
});

type ConfigValue = string | number | boolean | object | any[];
type ConfigType = "string" | "number" | "boolean" | "object" | "list";
type KeyDownField = "field" | "type" | "value";

interface Config {
    [key: string]: ConfigValue;
}

interface ConfigBuilderProps {
    initialConfig?: Config;
    onConfigChange?: (config: Config) => void;
    className?: string;
}

const ConfigBuilder = ({ initialConfig, onConfigChange, className }: ConfigBuilderProps) => {
    const [config, setConfig] = useState<Config>(initialConfig || {});
    const [field, setField] = useState("");
    const [type, setType] = useState<ConfigType>("string");
    const [value, setValue] = useState("");
    const [error, setError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [deleteKey, setDeleteKey] = useState("");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [copied, setCopied] = useState(false);

    const typeSelectRef = useRef<HTMLSelectElement>(null);
    const valueInputRef = useRef<HTMLDivElement>(null);
    const addButtonRef = useRef<HTMLButtonElement>(null);

    const types: ConfigType[] = ["string", "number", "boolean", "object", "list"];

    const handleKeyDown = (e: React.KeyboardEvent, currentField: KeyDownField) => {
        if (e.key === "Enter" && !e.shiftKey) {
            if (!(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
            }
            switch (currentField) {
                case "field":
                    typeSelectRef.current?.focus();
                    break;
                case "type":
                    valueInputRef.current?.focus();
                    break;
                case "value":
                    if (!(e.target instanceof HTMLTextAreaElement)) {
                        addButtonRef.current?.click();
                    }
                    break;
            }
        }
    };

    const getPlaceholder = () => {
        switch (type) {
            case "string":
                return "Enter string value...";
            case "number":
                return "Enter number value...";
            case "object":
                return '{ "key": "value" }';
            case "list":
                return '["item1", "item2"]';
            default:
                return "Enter value...";
        }
    };

    const formatJSONString = (jsonString: string) => {
        try {
            const parsed = JSON.parse(jsonString);
            return JSON.stringify(parsed, null, 2);
        } catch (e) {
            return jsonString;
        }
    };

    const resetForm = () => {
        setField("");
        setValue("");
        setType("string");
        setIsEditing(false);
        setError("");
    };

    const handleBlur = () => {
        if (type === "object" || type === "list") {
            try {
                const parsed = JSON.parse(value);
                setValue(JSON.stringify(parsed));
            } catch (e) {
                // If parsing fails, leave the value as is
            }
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDelete = () => {
        if (deleteKey) {
            const newConfig = { ...config };
            delete newConfig[deleteKey];

            // Update the state
            setConfig(newConfig);

            // Notify parent of the updated configuration
            if (onConfigChange) {
                onConfigChange(newConfig);
            }

            setDeleteKey("");
            setShowDeleteDialog(false);
        }
    };

    const handleEdit = (key: string) => {
        setField(key);
        const fieldValue = config[key];
        setType(typeof fieldValue === "object" ? (Array.isArray(fieldValue) ? "list" : "object") : (typeof fieldValue as ConfigType));
        setValue(typeof fieldValue === "object" ? JSON.stringify(fieldValue, null, 2) : String(fieldValue));
        setIsEditing(true);
    };

    const handleFormatValue = () => {
        if (type === "object" || type === "list") {
            setValue(formatJSONString(value));
        }
    };

    const validateAndAddField = () => {
        setError("");
        if (!field.trim()) {
            setError("Field name is required");
            return;
        }
        let processedValue: ConfigValue;
        try {
            switch (type) {
                case "string":
                    processedValue = String(value);
                    break;
                case "number":
                    processedValue = Number(value);
                    if (isNaN(processedValue)) throw new Error("Invalid number");
                    break;
                case "boolean":
                    processedValue = value === "true";
                    break;
                case "object":
                case "list":
                    processedValue = JSON.parse(value);
                    if (type === "list" && !Array.isArray(processedValue)) {
                        throw new Error("Not a valid array");
                    }
                    break;
                default:
                    processedValue = value;
            }

            // Create the new configuration with the updated field
            const updatedConfig = {
                ...config,
                [field]: processedValue,
            };

            // Update the state
            setConfig(updatedConfig);

            // Notify parent of the updated configuration
            if (onConfigChange) {
                onConfigChange(updatedConfig);
            }

            resetForm();
        } catch (err) {
            setError(`Invalid ${type} value: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    };

    const renderValueInput = () => {
        switch (type) {
            case "boolean":
                return (
                    <RadioGroup
                        defaultValue={value}
                        onValueChange={setValue}
                        className="flex gap-4 pl-2"
                        ref={valueInputRef}
                        onKeyDown={(e) => handleKeyDown(e, "value")}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id="true" />
                            <Label htmlFor="true" className="text-sm font-extralight">
                                True
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id="false" />
                            <Label htmlFor="false" className="text-sm font-extralight">
                                False
                            </Label>
                        </div>
                    </RadioGroup>
                );
            case "object":
            case "list":
                return (
                    <div className="relative">
                        <textarea
                            ref={valueInputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={handleBlur}
                            className="w-full h-24 px-2 py-1 border rounded border-gray-300 dark:border-gray-600 text-sm font-extralight font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            placeholder={getPlaceholder()}
                        />
                        <button
                            onClick={handleFormatValue}
                            className="absolute top-1 right-3 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-900 dark:text-gray-100"
                            title="Format JSON"
                        >
                            <AlignLeft className="h-5 w-5" />
                        </button>
                    </div>
                );
            default:
                return (
                    <input
                        ref={valueInputRef as React.RefObject<HTMLInputElement>}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, "value")}
                        className="w-full px-2 py-1 border rounded border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-700 dark:placeholder-gray-300"
                        placeholder={getPlaceholder()}
                    />
                );
        }
    };

    return (
        <div
            className={cn(
                `border rounded border-gray-200 dark:border-gray-700 ${inter.className} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-extralight tracking-tight antialiased h-full`,
                className
            )}
        >
            <div className="flex gap-2 p-2">
                <div className="w-1/2">
                    <div className="space-y-2">
                        <div className="flex gap-1">
                            <input
                                type="text"
                                value={field}
                                onChange={(e) => setField(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, "field")}
                                className="flex-1 px-2 py-1 border rounded border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-700 dark:placeholder-gray-300"
                                placeholder="Enter field name..."
                                disabled={isEditing}
                            />
                            <select
                                ref={typeSelectRef}
                                value={type}
                                onChange={(e) => setType(e.target.value as ConfigType)}
                                onKeyDown={(e) => handleKeyDown(e, "type")}
                                className="w-32 px-2 py-1 border rounded border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                {types.map((t) => (
                                    <option key={t} value={t} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                        {t}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>{renderValueInput()}</div>
                        {error && (
                            <Alert variant="destructive" className="py-1">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-sm font-extralight">{error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="flex gap-1">
                            <button
                                ref={addButtonRef}
                                onClick={validateAndAddField}
                                className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-sm hover:bg-blue-600 transition-colors"
                            >
                                {isEditing ? "Update Field" : "Add Field"}
                            </button>
                            <select
                                value={deleteKey}
                                onChange={(e) => {
                                    setDeleteKey(e.target.value);
                                    if (e.target.value) setShowDeleteDialog(true);
                                }}
                                className="px-2 py-1 border rounded border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                    Delete Field
                                </option>
                                {Object.keys(config).map((key) => (
                                    <option key={key} value={key} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                        {key}
                                    </option>
                                ))}
                            </select>
                            <select
                                value=""
                                onChange={(e) => {
                                    if (e.target.value) handleEdit(e.target.value);
                                }}
                                className="px-2 py-1 border rounded border-gray-300 dark:border-gray-600 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            >
                                <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                    Edit Field
                                </option>
                                {Object.keys(config).map((key) => (
                                    <option key={key} value={key} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                                        {key}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <ConfigJSONViewer data={config} copied={copied} onCopy={copyToClipboard} />
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-normal">Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-extralight text-gray-700 dark:text-gray-300">
                            Are you sure you want to delete the field "{deleteKey}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={() => setDeleteKey("")}
                            className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-extralight"
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="text-sm font-extralight">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ConfigBuilder;
