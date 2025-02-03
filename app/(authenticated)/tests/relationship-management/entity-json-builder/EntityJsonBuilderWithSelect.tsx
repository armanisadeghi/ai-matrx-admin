import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, RefreshCcw, Copy, Check, Key } from 'lucide-react';
import { EntityKeys } from '@/types';
import { useAppSelector, useEntityTools } from '@/lib/redux';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntitySelection } from '@/components/matrx/Entity';
import { createRecordKey } from '@/lib/redux';

interface EntityJsonBuilderProps {
    defaultEntity?: EntityKeys;
    label?: string;
    value?: string;
    onChange?: (value: string) => void;
    onEntityChange?: (entity: EntityKeys) => void;
}

interface FieldValue {
    field: string;
    value: string;
}

interface CopyState {
    [key: string]: boolean;
}

export default function EntityJsonBuilderWithSelect({
    defaultEntity = 'dataBroker',
    label = 'Entity Configuration',
    value: externalValue,
    onChange,
    onEntityChange,
}: EntityJsonBuilderProps) {
    const [entity, setEntity] = useState<EntityKeys>(defaultEntity);
    const [fieldValues, setFieldValues] = useState<FieldValue[]>([]);
    const [customField, setCustomField] = useState('');
    const [customValue, setCustomValue] = useState('');
    const [selectedField, setSelectedField] = useState<string>('');
    const [copyStates, setCopyStates] = useState<CopyState>({});
    const [jsonCopyState, setJsonCopyState] = useState(false);
    const [internalValue, setInternalValue] = useState('');
    const [showMatrxId, setShowMatrxId] = useState(false);

    const { selectors } = useEntityTools(entity);
    const fieldOptions = useAppSelector(selectors.selectNativeFieldOptionsWithDefaults);
    const primaryKeyMetadata = useAppSelector(selectors.selectPrimaryKeyMetadata);
    const primaryKeyFields = primaryKeyMetadata?.fields || [];

    const value = externalValue !== undefined ? externalValue : internalValue;

    const generateMatrxRecordId = useCallback(() => {
        // Create record object with raw values from fields
        const record = fieldValues.reduce((acc, { field, value }) => {
            acc[field] = value;
            return acc;
        }, {} as Record<string, any>);

        try {
            const matrxRecordId = createRecordKey(primaryKeyMetadata, record);
            const newFieldValues = fieldValues.filter((fv) => fv.field !== 'matrxRecordId');
            const updatedFields = [
                ...newFieldValues,
                {
                    field: 'matrxRecordId',
                    value: matrxRecordId,
                },
            ];
            setFieldValues(updatedFields);
            updateJsonOutput(updatedFields);
            setShowMatrxId(true);
        } catch (error) {
            console.error('Failed to generate matrxRecordId:', error);
        }
    }, [fieldValues, primaryKeyFields, primaryKeyMetadata]);

    useEffect(() => {
        if (value) {
            try {
                const parsedValue = JSON.parse(value);
                const initialFields = Object.entries(parsedValue).map(([field, value]) => ({
                    field,
                    value: String(value ?? ''),
                }));
                setFieldValues(initialFields);
            } catch (e) {
                console.error('Failed to parse initial value:', e);
            }
        } else {
            const initialFields = fieldOptions.map((option) => ({
                field: option.value,
                value: String(option.defaultValue ?? ''),
            }));
            setFieldValues(initialFields);
            updateJsonOutput(initialFields);
        }
    }, [entity]);

    const updateJsonOutput = (fields: FieldValue[]) => {
        const jsonObject = fields.reduce((acc, { field, value }) => {
            let parsedValue: any = value;
            if (value.toLowerCase() === 'true') parsedValue = true;
            else if (value.toLowerCase() === 'false') parsedValue = false;
            else if (!isNaN(Number(value)) && value !== '') parsedValue = Number(value);
            else if (value === 'null') parsedValue = null;

            acc[field] = parsedValue;
            return acc;
        }, {} as Record<string, any>);

        const jsonString = JSON.stringify(jsonObject);
        if (onChange) {
            onChange(jsonString);
        } else {
            setInternalValue(jsonString);
        }
    };

    const handleEntityChange = (newEntity: EntityKeys) => {
        setEntity(newEntity);
        setShowMatrxId(false);
        if (onEntityChange) {
            onEntityChange(newEntity);
        }
    };

    const handleCopy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            if (key === 'json') {
                setJsonCopyState(true);
                setTimeout(() => setJsonCopyState(false), 2000);
            } else {
                setCopyStates((prev) => ({ ...prev, [key]: true }));
                setTimeout(() => {
                    setCopyStates((prev) => ({ ...prev, [key]: false }));
                }, 2000);
            }
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleAdd = () => {
        let fieldToAdd = customField;
        let valueToAdd = customValue;

        if (selectedField) {
            fieldToAdd = selectedField;
            const fieldOption = fieldOptions.find((opt) => opt.value === selectedField);
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
        const newFieldValues = fieldValues.map((item, i) => (i === index ? { ...item, value: newValue } : item));
        setFieldValues(newFieldValues);
        updateJsonOutput(newFieldValues);
    };

    const handleReset = () => {
        const initialFields = fieldOptions.map((option) => ({
            field: option.value,
            value: String(option.defaultValue ?? ''),
        }));
        setFieldValues(initialFields);
        setShowMatrxId(false);
        updateJsonOutput(initialFields);
    };

    const availableFields = fieldOptions.filter((option) => !fieldValues.some((fv) => fv.field === option.value));

    return (
        <div className='space-y-2'>
            <div className='flex items-center gap-2'>
                <EntitySelection
                    selectedEntity={entity}
                    onEntityChange={handleEntityChange}
                    layout='sideBySide'
                    className='flex-1'
                />
                <Button
                    variant='ghost'
                    size='icon'
                    onClick={handleReset}
                    className='h-9 w-9'
                >
                    <RefreshCcw className='h-4 w-4' />
                </Button>
            </div>

            <Card className='bg-muted/50'>
                <CardContent className='pt-2 space-y-2'>
                    <div className='flex gap-2'>
                        {availableFields.length > 0 ? (
                            <Select
                                value={selectedField}
                                onValueChange={setSelectedField}
                            >
                                <SelectTrigger className='flex-1'>
                                    <SelectValue placeholder='Select field' />
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
                                placeholder='Custom field name'
                                className='flex-1'
                            />
                        )}

                        {!selectedField && (
                            <Input
                                value={customValue}
                                onChange={(e) => setCustomValue(e.target.value)}
                                placeholder='Value'
                                className='flex-1'
                            />
                        )}

                        <Button
                            onClick={handleAdd}
                            disabled={!selectedField && (!customField || !customValue)}
                            size='icon'
                        >
                            <Plus className='h-4 w-4' />
                        </Button>
                    </div>

                    <div className='space-y-1'>
                        {fieldValues.map((item, index) => {
                            if (item.field === 'matrxRecordId' && !showMatrxId) return null;
                            const fieldOption = fieldOptions.find((opt) => opt.value === item.field);
                            return (
                                <div
                                    key={index}
                                    className='flex gap-2 items-center bg-background p-1.5 rounded-md'
                                >
                                    <div className='w-1/3 font-medium text-sm'>{fieldOption?.label || item.field}:</div>
                                    <Input
                                        value={item.value}
                                        onChange={(e) => handleValueChange(index, e.target.value)}
                                        className='flex-1'
                                        disabled={item.field === 'matrxRecordId'}
                                    />
                                    <Button
                                        variant='ghost'
                                        size='icon'
                                        onClick={() => handleCopy(item.value, `field-${index}`)}
                                        className='h-7 w-7'
                                    >
                                        {copyStates[`field-${index}`] ? <Check className='h-3 w-3' /> : <Copy className='h-3 w-3' />}
                                    </Button>
                                    {item.field !== 'matrxRecordId' && (
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            onClick={() => handleRemove(index)}
                                            className='h-7 w-7'
                                        >
                                            <X className='h-3 w-3' />
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className='flex justify-end'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={generateMatrxRecordId}
                            className='flex gap-2'
                        >
                            <Key className='h-4 w-4' />
                            Generate MatrxRecordId
                        </Button>
                    </div>

                    {value && (
                        <div className='relative'>
                            <div className='text-sm font-medium'>Current JSON Data:</div>
                            <div className='bg-muted p-2 rounded-md'>
                                <pre className='text-xs whitespace-pre-wrap break-all'>{JSON.stringify(JSON.parse(value), null, 2)}</pre>
                            </div>
                            <Button
                                variant='ghost'
                                size='icon'
                                onClick={() => handleCopy(value, 'json')}
                                className='absolute top-1 right-1 h-6 w-6'
                            >
                                {jsonCopyState ? <Check className='h-3 w-3' /> : <Copy className='h-3 w-3' />}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
