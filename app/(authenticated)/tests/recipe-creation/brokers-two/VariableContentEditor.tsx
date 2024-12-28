import React, {useState} from 'react';
import {Card, CardContent, CardHeader} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Switch} from "@/components/ui/switch";
import {AlertCircle, CheckCircle2, ChevronDown, ChevronUp, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible";
import { componentTypes, sourceTypes } from './constants';

export const VariableContentEditor = (
    {
        data,
        onChange,
        onDelete
    }) => {
    const [isOpen, setIsOpen] = useState(true);
    const needsSourceDetails = ['API', 'Database', 'Function'].includes(data.defaultSource);

    const handleChange = (field, value) => {
        onChange?.({
            ...data,
            [field]: value
        });
    };

    return (
        <Card className={`w-full mb-4 ${!data.isConnected ? 'border-red-500' : ''}`}>
            <Collapsible open={isOpen}>
            <CardHeader className="p-2 flex flex-row items-center space-y-0">
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={onDelete}
                >
                    <X className="h-4 w-4"/>
                </Button>
                <CollapsibleTrigger
                    className="flex-1 flex items-center justify-between"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center space-x-2">
                        {data.isConnected ?
                         <CheckCircle2 className="h-4 w-4 text-green-500"/> :
                         <AlertCircle className="h-4 w-4 text-red-500"/>
                        }
                        <span className="font-medium">{data.displayName || 'Unnamed Variable'}</span>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
                </CollapsibleTrigger>
            </CardHeader>

                <CollapsibleContent>
                    <CardContent className="p-2 space-y-3">
                        {/* Display Name & Official Name */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input
                                    value={data.displayName}
                                    onChange={(e) => handleChange('displayName', e.target.value)}
                                    className="h-8"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Official Name</Label>
                                <Input
                                    value={data.officialName}
                                    onChange={(e) => handleChange('officialName', e.target.value)}
                                    className="h-8"
                                />
                            </div>
                        </div>

                        {/* Value */}
                        <div className="space-y-2">
                            <Label>Value</Label>
                            <Textarea
                                value={data.value}
                                onChange={(e) => handleChange('value', e.target.value)}
                                className="h-20"
                            />
                        </div>

                        {/* Component Type & Default Source */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2">
                                <Label>Component Type</Label>
                                <Select
                                    value={data.componentType}
                                    onValueChange={(value) => handleChange('componentType', value)}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue/>
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
                                <Label>Default Source</Label>
                                <Select
                                    value={data.defaultSource}
                                    onValueChange={(value) => handleChange('defaultSource', value)}
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sourceTypes.map((type) => (
                                            <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Source Details */}
                        {needsSourceDetails && (
                            <div className="space-y-2">
                                <Label>Source Details</Label>
                                <Input
                                    value={data.sourceDetails}
                                    onChange={(e) => handleChange('sourceDetails', e.target.value)}
                                    placeholder={`Enter ${data.defaultSource} details...`}
                                />
                            </div>
                        )}

                        {/* Ready Switch */}
                        <div className="flex items-center space-x-2">
                            <Label htmlFor={`ready-switch-${data.id}`} className="cursor-pointer">
                                Ready
                            </Label>
                            <Switch
                                id={`ready-switch-${data.id}`}
                                checked={data.isReady}
                                onCheckedChange={(checked) => handleChange('isReady', checked)}
                            />
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
};
