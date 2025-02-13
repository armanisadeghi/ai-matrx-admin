import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Input } from '@/components/ui';
import { withBrokerComponentWrapper } from '../wrappers/withBrokerComponentWrapper';
import { cn } from '@/utils';   
import { useOtherOption } from './hooks/useOtherOption';

export const BrokerSelect = withBrokerComponentWrapper(({ 
    value, 
    onChange, 
    inputComponent,
    isDemo,
    ...rest
}) => {
    const {
        showOtherInput,
        otherValue,
        selected,
        internalOptions,
        handleChange,
        handleOtherInputChange,
        getDisplayValue
    } = useOtherOption({
        value,
        options: inputComponent.options ?? [],
        includeOther: inputComponent.includeOther,
        onChange
    });

    return (
        <div className={cn('space-y-2', inputComponent.componentClassName)}>
            <Select
                value={selected as string}
                onValueChange={handleChange}
            >
                <SelectTrigger>
                    <SelectValue placeholder={inputComponent.placeholder}>
                        {selected === '_other' ? otherValue || 'Other' : selected}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {internalOptions.map((option) => (
                        <SelectItem
                            key={option}
                            value={option}
                        >
                            {getDisplayValue(option)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {showOtherInput && (
                <Input
                    value={otherValue}
                    onChange={(e) => handleOtherInputChange(e.target.value)}
                    placeholder='Enter custom value...'
                    className='mt-2'
                />
            )}
        </div>
    );
});