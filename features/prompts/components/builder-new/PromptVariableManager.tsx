import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux/hooks';
import {
    selectPromptVariables,
    addVariable,
    removeVariable,
    updateVariable
} from '@/lib/redux/slices/promptEditorSlice';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Variable } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export const PromptVariableManager: React.FC = () => {
    const dispatch = useAppDispatch();
    const variables = useAppSelector(selectPromptVariables);

    const [newVariableName, setNewVariableName] = useState('');
    const [newVariableDefault, setNewVariableDefault] = useState('');

    const handleAdd = () => {
        if (!newVariableName.trim()) return;

        // Check for duplicates
        if (variables.some(v => v.name === newVariableName.trim())) {
            return; // TODO: Show error
        }

        dispatch(addVariable({
            name: newVariableName.trim(),
            defaultValue: newVariableDefault
        }));

        setNewVariableName('');
        setNewVariableDefault('');
    };

    const handleRemove = (name: string) => {
        dispatch(removeVariable(name));
    };

    const handleUpdateDefault = (name: string, value: string) => {
        dispatch(updateVariable({ name, updates: { defaultValue: value } }));
    };

    return (
        <Card className="h-full border-l rounded-none flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Variables</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
                <CardContent className="space-y-6">
                    {/* Add New Variable */}
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                        <h4 className="text-sm font-medium">Add Variable</h4>
                        <div className="space-y-2">
                            <Label htmlFor="var-name" className="text-xs">Name</Label>
                            <Input
                                id="var-name"
                                placeholder="e.g. user_name"
                                value={newVariableName}
                                onChange={(e) => setNewVariableName(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="var-default" className="text-xs">Default Value</Label>
                            <Input
                                id="var-default"
                                placeholder="Optional default value"
                                value={newVariableDefault}
                                onChange={(e) => setNewVariableDefault(e.target.value)}
                                className="h-8"
                            />
                        </div>
                        <Button
                            onClick={handleAdd}
                            disabled={!newVariableName.trim()}
                            className="w-full h-8"
                            size="sm"
                        >
                            <Plus className="w-3 h-3 mr-2" />
                            Add Variable
                        </Button>
                    </div>

                    <Separator />

                    {/* Variable List */}
                    <div className="space-y-4">
                        {variables.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Variable className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No variables defined</p>
                            </div>
                        ) : (
                            variables.map((variable) => (
                                <div key={variable.name} className="space-y-2 p-3 border rounded-md group hover:border-primary/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {`{{${variable.name}}}`}
                                            </Badge>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleRemove(variable.name)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Default Value</Label>
                                        <Input
                                            value={variable.defaultValue}
                                            onChange={(e) => handleUpdateDefault(variable.name, e.target.value)}
                                            className="h-7 text-xs"
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </ScrollArea>
        </Card>
    );
};

import { Badge } from "@/components/ui/badge";
