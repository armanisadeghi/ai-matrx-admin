import React, {useState} from 'react';
import {Wand2, Copy, Check, RotateCcw, History, Trash} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

interface EntityUUIDFieldProps {
    value?: string;
    onChange?: (value: string) => void;
    placeholder?: string;
    showHistory?: boolean;
    maxHistory?: number;
}

const EntityUUIDField: React.FC<EntityUUIDFieldProps> = (
    {
        value = '',
        onChange = (value: string) => {
        },
        placeholder = "UUID...",
        showHistory = true,
        maxHistory = 5
    }) => {
    const [copied, setCopied] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [version] = useState(4); // UUID version (4 is random)

    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const isValidUUID = (uuid: string): boolean => uuidRegex.test(uuid);

    const generateUUID = () => {
        const oldValue = value;
        const newUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        onChange(newUuid);

        // Add to history if it's a valid UUID and different from the last one
        if (oldValue && isValidUUID(oldValue) && !history.includes(oldValue)) {
            setHistory(prev => [oldValue, ...prev].slice(0, maxHistory));
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const clearValue = () => {
        if (value && isValidUUID(value)) {
            setHistory(prev => [value, ...prev].slice(0, maxHistory));
        }
        onChange('');
    };

    const restoreFromHistory = (historicValue: string) => {
        if (value) {
            setHistory(prev => [value, ...prev.filter(v => v !== historicValue)].slice(0, maxHistory));
        }
        onChange(historicValue);
    };

    const getInputVariantClass = () => {
        if (!value) return '';
        return isValidUUID(value) ? 'border-green-500' : 'border-red-500';
    };

    return (
        <div className="relative">
            <div className="relative">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`font-mono text-sm pr-32 ${getInputVariantClass()}`}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    {/* Generate Button */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={generateUUID}
                            >
                                <Wand2 className="h-4 w-4"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Generate UUID</TooltipContent>
                    </Tooltip>

                    {/* Copy Button */}
                    {value && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={copyToClipboard}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4"/>
                                    ) : (
                                         <Copy className="h-4 w-4"/>
                                     )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy to clipboard</TooltipContent>
                        </Tooltip>
                    )}

                    {/* Clear Button */}
                    {value && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={clearValue}
                                >
                                    <Trash className="h-4 w-4"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear</TooltipContent>
                        </Tooltip>
                    )}

                    {/* History Dropdown */}
                    {showHistory && history.length > 0 && (
                        <DropdownMenu>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                        >
                                            <History className="h-4 w-4"/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>History</TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="w-[300px]">
                                {history.map((uuid, index) => (
                                    <DropdownMenuItem
                                        key={index}
                                        onClick={() => restoreFromHistory(uuid)}
                                        className="flex justify-between items-center font-mono"
                                    >
                                        <span className="truncate">{uuid}</span>
                                        <RotateCcw className="h-3 w-3 ml-2 flex-shrink-0"/>
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator/>
                                <DropdownMenuItem
                                    onClick={() => setHistory([])}
                                    className="text-destructive"
                                >
                                    Clear History
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Validation Message */}
            {value && !isValidUUID(value) && (
                <div className="absolute -bottom-5 left-0 text-xs text-red-500">
                    Invalid UUID format
                </div>
            )}
        </div>
    );
};

export default EntityUUIDField;
