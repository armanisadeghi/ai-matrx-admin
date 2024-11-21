import React, { useState } from 'react';
import { X, Plus, Copy, Check, Wand2, ChevronDown, ChevronUp, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const EntityUUIDArray = () => {
    const [inputValue, setInputValue] = useState('');
    const [uuids, setUuids] = useState([]);
    const [copiedId, setCopiedId] = useState(null);
    const [showExternal, setShowExternal] = useState(false);

    // UUID validation regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const generateUUID = () => {
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        setInputValue(uuid);
    };

    const handleAdd = (e) => {
        e?.preventDefault();

        if (!inputValue.trim()) return;

        if (!uuidRegex.test(inputValue)) {
            alert('Please enter a valid UUID');
            return;
        }

        if (!uuids.includes(inputValue)) {
            setUuids([...uuids, inputValue]);
            setInputValue('');
        }
    };

    const handleRemove = (uuid, e) => {
        e?.stopPropagation();
        setUuids(uuids.filter(v => v !== uuid));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd(e);
        }
    };

    const copyToClipboard = async (uuid, e) => {
        e?.stopPropagation();
        try {
            await navigator.clipboard.writeText(uuid);
            setCopiedId(uuid);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add UUID..."
                    className="font-mono text-sm pr-28"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={generateUUID}
                        title="Generate UUID"
                    >
                        <Wand2 className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={handleAdd}
                        title="Add UUID"
                        disabled={!inputValue}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShowExternal(!showExternal)}
                        title={showExternal ? "Show inline" : "Show external"}
                    >
                        {showExternal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Inline Dropdown Menu */}
                {!showExternal && uuids.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="absolute left-0 right-0 -bottom-9 w-full justify-between font-normal"
                            >
                                <div className="flex items-center gap-2">
                                    <ListFilter className="h-4 w-4" />
                                    <span>{uuids.length} UUID{uuids.length !== 1 ? 's' : ''} stored</span>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            {uuids.map((uuid) => (
                                <DropdownMenuItem
                                    key={uuid}
                                    className="flex justify-between items-center"
                                >
                                    <span className="font-mono truncate flex-1">{uuid}</span>
                                    <div className="flex gap-1 ml-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => copyToClipboard(uuid, e)}
                                        >
                                            {copiedId === uuid ? (
                                                <Check className="h-3 w-3" />
                                            ) : (
                                                 <Copy className="h-3 w-3" />
                                             )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={(e) => handleRemove(uuid, e)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* External View */}
            {showExternal && uuids.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {uuids.map((uuid) => (
                        <div
                            key={uuid}
                            className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2 font-mono text-sm"
                        >
                            <span className="truncate max-w-48">{uuid}</span>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => copyToClipboard(uuid, e)}
                                >
                                    {copiedId === uuid ? (
                                        <Check className="h-3 w-3" />
                                    ) : (
                                         <Copy className="h-3 w-3" />
                                     )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => handleRemove(uuid, e)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EntityUUIDArray;
