import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

interface JsonBuilderProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

interface FieldValue {
    field: string;
    value: string;
}

export default function JsonBuilder({ label, value, onChange }: JsonBuilderProps) {
    const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
    const [currentField, setCurrentField] = useState('');
    const [currentValue, setCurrentValue] = useState('');

    const handleAdd = () => {
        if (currentField && currentValue) {
            const newFieldValues = [...fieldValues, { field: currentField, value: currentValue }];
            setFieldValues(newFieldValues);
            setCurrentField('');
            setCurrentValue('');
            
            // Convert to JSON string and update parent
            const jsonObject = newFieldValues.reduce((acc, { field, value }) => {
                acc[field] = value;
                return acc;
            }, {} as Record<string, string>);
            onChange(JSON.stringify(jsonObject));
        }
    };

    const handleRemove = (index: number) => {
        const newFieldValues = fieldValues.filter((_, i) => i !== index);
        setFieldValues(newFieldValues);
        
        // Update JSON after removal
        const jsonObject = newFieldValues.reduce((acc, { field, value }) => {
            acc[field] = value;
            return acc;
        }, {} as Record<string, string>);
        onChange(jsonObject.length ? JSON.stringify(jsonObject) : '');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && currentField && currentValue) {
            handleAdd();
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{label}</label>
            <Card className="bg-muted/50">
                <CardContent className="pt-4 space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={currentField}
                            onChange={(e) => setCurrentField(e.target.value)}
                            placeholder="Field name"
                            className="flex-1"
                            onKeyPress={handleKeyPress}
                        />
                        <Input
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            placeholder="Value"
                            className="flex-1"
                            onKeyPress={handleKeyPress}
                        />
                        <Button 
                            onClick={handleAdd}
                            disabled={!currentField || !currentValue}
                            size="icon"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Display added fields */}
                    <div className="space-y-2">
                        {fieldValues.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center bg-background p-2 rounded-md">
                                <div className="flex-1 font-mono text-sm">
                                    {item.field}: {item.value}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemove(index)}
                                    className="h-8 w-8"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* Preview */}
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

