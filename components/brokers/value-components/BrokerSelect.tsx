import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label, Input } from '@/components/ui';
import { withBrokerInput, withBrokerCustomInput } from '../wrappers/withMockBrokerInput';
import { useState, useEffect } from 'react';

export const BrokerSelect = withBrokerInput(({ value, onChange, inputComponent }) => {
    const options = inputComponent.options ?? [];
    const allOptions = inputComponent.includeOther ? [...options, { label: 'Other', value: '_other' }] : options;

    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherValue, setOtherValue] = useState('');
    const [displayValue, setDisplayValue] = useState(() => {
        const isValueInOptions = options.some((option) => option.value === value);
        return !isValueInOptions && value ? '_other' : value;
    });

    useEffect(() => {
        const isValueInOptions = options.some((option) => option.value === value);
        if (!isValueInOptions && value) {
            setShowOtherInput(true);
            setOtherValue(value);
            setDisplayValue('_other');
        } else if (isValueInOptions) {
            setDisplayValue(value);
            setShowOtherInput(false);
        }
    }, [value, options]);

    const handleChange = (newValue: string) => {
        if (newValue === '_other') {
            setShowOtherInput(true);
            setDisplayValue('_other');
            onChange(otherValue);
        } else {
            setShowOtherInput(false);
            setDisplayValue(newValue);
            onChange(newValue);
        }
    };

    const handleOtherInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setOtherValue(newValue);
        onChange(newValue);
    };

    return (
        <div className='space-y-2'>
            <Select
                value={displayValue || ''}
                onValueChange={handleChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder={inputComponent.additionalParams?.placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {allOptions.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={handleOtherInputChange}
                    placeholder='Enter custom value...'
                    className='mt-2'
                />
            )}
        </div>
    );
});

export const BrokerCustomSelect = withBrokerCustomInput(({ value, onChange, inputComponent }) => {
    const options = inputComponent.options ?? [];
    const allOptions = inputComponent.includeOther ? [...options, { label: 'Other', value: '_other' }] : options;

    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherValue, setOtherValue] = useState('');

    const handleChange = (newValue: string) => {
        if (newValue === '_other') {
            setShowOtherInput(true);
            onChange(otherValue);
        } else {
            setShowOtherInput(false);
            onChange(newValue);
        }
    };

    return (
        <>
            <Label>{inputComponent.name}</Label>
            <Select
                value={value}
                onValueChange={handleChange}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {allOptions.map((option) => (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={(e) => {
                        setOtherValue(e.target.value);
                        onChange(e.target.value);
                    }}
                    placeholder='Enter custom value...'
                />
            )}
            {inputComponent.description && <p className='text-sm text-muted-foreground'>{inputComponent.description}</p>}
        </>
    );
});
