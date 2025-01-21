import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, RefreshCcw } from 'lucide-react';
import { EntityKeys } from '@/types';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EntityJsonBuilderProps {
    entity: EntityKeys;
    label: string;
    value: string;
    onChange: (value: string) => void;
}

interface FieldValue {
    field: string;
    value: string;
}


export default function EntityJsonBuilder({ entity, label, value, onChange }: EntityJsonBuilderProps) {
    const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
    const [customField, setCustomField] = useState('');
    const [customValue, setCustomValue] = useState('');
    const [selectedField, setSelectedField] = useState<string>('');
    
    const { selectors } = useEntityTools(entity);
    const fieldOptions = useAppSelector(selectors.selectNativeFieldOptionsWithDefaults);

    useEffect(() => {
        if (value) {
            try {
                const parsedValue = JSON.parse(value);
                const initialFields = Object.entries(parsedValue).map(([field, value]) => ({
                    field,
                    value: String(value ?? '')
                }));
                setFieldValues(initialFields);
            } catch (e) {
                console.error('Failed to parse initial value:', e);
            }
        } else {
            const initialFields = fieldOptions.map(option => ({
                field: option.value,
                value: String(option.defaultValue ?? '')
            }));
            setFieldValues(initialFields);
            updateJsonOutput(initialFields);
        }
    }, [entity]);

    const updateJsonOutput = (fields: FieldValue[]) => {
        const jsonObject = fields.reduce((acc, { field, value }) => {
            // Try to convert string values to their appropriate type
            let parsedValue: any = value;
            if (value.toLowerCase() === 'true') parsedValue = true;
            else if (value.toLowerCase() === 'false') parsedValue = false;
            else if (!isNaN(Number(value)) && value !== '') parsedValue = Number(value);
            else if (value === 'null') parsedValue = null;
            
            acc[field] = parsedValue;
            return acc;
        }, {} as Record<string, any>);
        
        onChange(JSON.stringify(jsonObject));
    };

    const handleAdd = () => {
        let fieldToAdd = customField;
        let valueToAdd = customValue;

        if (selectedField) {
            fieldToAdd = selectedField;
            const fieldOption = fieldOptions.find(opt => opt.value === selectedField);
            valueToAdd = String(fieldOption?.defaultValue ?? '');
        }

        if (fieldToAdd) {
            const newFieldValues = [...fieldValues, { field: fieldToAdd, value: valueToAdd }];
            setFieldValues(newFieldValues);
            setCustomField('');
            setCustomValue('');
            setSelectedField('');
            updateJsonOutput(newFieldValues);
        }
    };

    const handleRemove = (index: number) => {
        const newFieldValues = fieldValues.filter((_, i) => i !== index);
        setFieldValues(newFieldValues);
        updateJsonOutput(newFieldValues);
    };

    const handleValueChange = (index: number, newValue: string) => {
        const newFieldValues = fieldValues.map((item, i) => 
            i === index ? { ...item, value: newValue } : item
        );
        setFieldValues(newFieldValues);
        updateJsonOutput(newFieldValues);
    };

    const handleReset = () => {
        const initialFields = fieldOptions.map(option => ({
            field: option.value,
            value: String(option.defaultValue ?? '')
        }));
        setFieldValues(initialFields);
        updateJsonOutput(initialFields);
    };

    // Get remaining available fields
    const availableFields = fieldOptions.filter(
        option => !fieldValues.some(fv => fv.field === option.value)
    );

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-xs text-muted-foreground">{label}</label>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="h-8"
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                </Button>
            </div>
            <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-4">
                    {/* Add Field Section */}
                    <div className="flex gap-2">
                        {availableFields.length > 0 ? (
                            <Select
                                value={selectedField}
                                onValueChange={setSelectedField}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableFields.map((option) => (
                                        <SelectItem
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                value={customField}
                                onChange={(e) => setCustomField(e.target.value)}
                                placeholder="Custom field name"
                                className="flex-1"
                            />
                        )}
                        
                        {!selectedField && (
                            <Input
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                placeholder="Value"
                                className="flex-1"
                            />
                        )}
                        
                        <Button 
                            onClick={handleAdd}
                            disabled={!selectedField && (!customField || !customValue)}
                            size="icon"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Field List */}
                    <div className="space-y-2">
                        {fieldValues.map((item, index) => {
                            const fieldOption = fieldOptions.find(opt => opt.value === item.field);
                            return (
                                <div key={index} className="flex gap-2 items-center bg-background p-2 rounded-md">
                                    <div className="w-1/3 font-medium text-sm">
                                        {fieldOption?.label || item.field}:
                                    </div>
                                    <Input
                                        value={item.value}
                                        onChange={(e) => handleValueChange(index, e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemove(index)}
                                        className="h-8 w-8"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    {/* JSON Preview */}
                    {value && (
                        <div className="text-xs font-mono bg-background p-2 rounded-md break-all">
                            {value}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}