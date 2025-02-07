import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Label, Input } from '@/components/ui';
import { withBrokerInput } from '../components/withBrokerInput';
import { useState } from 'react';

export const BrokerSelect = withBrokerInput(({ value, onChange, broker, inputComponent }) => {
    const options = inputComponent.options ?? [];
    const allOptions = inputComponent.include_other ? [...options, { label: 'Other', value: '_other' }] : options;

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
