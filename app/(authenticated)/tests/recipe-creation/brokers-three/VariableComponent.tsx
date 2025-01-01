// components/VariableComponent.tsx
import React, {useState} from 'react';
import {Card, CardContent, CardHeader} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Variable, InputComponentType, SourceType} from '../../../../contexts/old/useVariablesStoreTwo';
import {ChevronDown, ChevronUp, X} from 'lucide-react';
import {Label} from "@/components/ui";

interface VariableComponentProps {
    variable: Variable;
    onVariableChange: (updates: Partial<Variable>) => void;
    onDelete: () => void;
}

export const VariableComponent = (
    {
        variable,
        onVariableChange,
        onDelete,
    }: VariableComponentProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const handleChange = (field: keyof Variable, value: any) => {
        onVariableChange({[field]: value});
    };

    return (
        <Card className={`
      relative mb-4 transition-all
      ${variable.mode === 'destructive' ? 'border-red-500' : 'border-gray-200'}
      ${variable.isReady ? 'bg-green-50 dark:bg-green-900/20' : ''}
    `}>
            <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 text-red-500"
                onClick={onDelete}
            >
                <X className="h-4 w-4"/>
            </Button>

            <CardHeader
                className="cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                        {variable.displayName || 'Unnamed Variable'}
                    </h3>
                    {isExpanded ? <ChevronUp/> : <ChevronDown/>}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4">
                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                placeholder="Display Name"
                                value={variable.displayName}
                                onChange={(e) => handleChange('displayName', e.target.value)}
                            />
                            <Input
                                placeholder="Official Name"
                                value={variable.officialName}
                                onChange={(e) => handleChange('officialName', e.target.value)}
                            />
                        </div>

                        <Textarea
                            placeholder="Value"
                            value={variable.value}
                            onChange={(e) => handleChange('value', e.target.value)}
                        />

                        <Select
                            value={variable.inputComponentType}
                            onValueChange={(value: InputComponentType) =>
                                handleChange('inputComponentType', value)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select input type"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Input">Input</SelectItem>
                                <SelectItem value="Textarea">Textarea</SelectItem>
                                <SelectItem value="Select">Select</SelectItem>
                                <SelectItem value="Switch">Switch</SelectItem>
                                <SelectItem value="Slider">Slider</SelectItem>
                                <SelectItem value="Radio">Radio</SelectItem>
                                <SelectItem value="Checkbox">Checkbox</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex items-center justify-between">
                            <Label>Ready</Label>
                            <Switch
                                checked={variable.isReady}
                                onCheckedChange={(checked) => handleChange('isReady', checked)}
                            />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={variable.isReady}
                                onCheckedChange={(checked) => handleChange('isReady', checked)}
                            />
                            <span>Ready</span>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};
