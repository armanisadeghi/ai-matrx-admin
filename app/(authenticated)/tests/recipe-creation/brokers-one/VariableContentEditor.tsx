'use client';

import React, {useState, useCallback} from 'react';
import {v4 as uuidv4} from 'uuid';
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {AlertCircle, CheckCircle2} from "lucide-react";
import { componentTypes } from '../brokers-two/constants';


const VariableContentEditor = (
    {
        initialData,
        isDestructive = false,
        onChange
    }) => {
    const [data, setData] = useState({
        id: initialData?.id || uuidv4(),
        name: initialData?.name || '',
        content: initialData?.content || '',
        componentType: initialData?.componentType || 'input',
        instructions: initialData?.instructions || '',
        isConnected: initialData?.isConnected ?? true
    });

    const handleChange = useCallback((field, value) => {
        setData(prev => {
            const newData = {...prev, [field]: value};
            onChange?.(newData);
            return newData;
        });
    }, [onChange]);

    return (
        <Card className={`w-full mb-4 ${isDestructive ? 'border-red-500 dark:border-red-400' : ''}`}>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        {isDestructive ? (
                            <AlertCircle className="h-4 w-4 text-red-500"/>
                        ) : (
                             <CheckCircle2 className="h-4 w-4 text-green-500"/>
                         )}
                        <span className="text-xs text-muted-foreground">
              ID: {data.id.slice(0, 8)}
            </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`name-${data.id}`}>Name</Label>
                    <Input
                        id={`name-${data.id}`}
                        value={data.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="h-8"
                        placeholder="Variable name"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`content-${data.id}`}>Content</Label>
                    <Textarea
                        id={`content-${data.id}`}
                        value={data.content}
                        onChange={(e) => handleChange('content', e.target.value)}
                        className="h-20 min-h-[80px]"
                        placeholder="Variable content"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Input Component Type</Label>
                    <Select
                        value={data.componentType}
                        onValueChange={(value) => handleChange('componentType', value)}
                    >
                        <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select type"/>
                        </SelectTrigger>
                        <SelectContent>
                            {componentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor={`instructions-${data.id}`}>Instructions</Label>
                    <Textarea
                        id={`instructions-${data.id}`}
                        value={data.instructions}
                        onChange={(e) => handleChange('instructions', e.target.value)}
                        className="h-16 min-h-[64px]"
                        placeholder="Usage instructions"
                    />
                </div>
            </CardContent>
        </Card>
    );
};

export default VariableContentEditor;
