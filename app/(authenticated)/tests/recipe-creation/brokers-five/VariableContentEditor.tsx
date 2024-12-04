// IntelligentEditor.tsx
'use client';

import React from 'react';
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Variable} from './types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


interface VariableContentEditorProps {
    data: Variable;
    onChange: (data: Partial<Variable>) => void;
}

export const VariableContentEditor: React.FC<VariableContentEditorProps> = (
    {
        data,
        onChange
    }) => {
    return (
        <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
                <label className="text-sm font-medium">Display Name</label>
                <Input
                    value={data.displayName}
                    onChange={(e) => onChange({displayName: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Component Type</label>
                <Select
                    value={data.componentType}
                    onValueChange={(value) => onChange({componentType: value})}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select component type"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="input">Input</SelectItem>
                        <SelectItem value="select">Select</SelectItem>
                        <SelectItem value="textarea">Textarea</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Instructions</label>
                <Input
                    value={data.instructions}
                    onChange={(e) => onChange({instructions: e.target.value})}
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Default Source</label>
                <Select
                    value={data.defaultSource}
                    onValueChange={(value) => onChange({defaultSource: value})}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select default source"/>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="System">System</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="checkbox"
                    checked={data.isReady}
                    onChange={(e) => onChange({isReady: e.target.checked})}
                    id={`ready-${data.id}`}
                />
                <label htmlFor={`ready-${data.id}`} className="text-sm">Ready</label>
            </div>
        </div>
    );
};
