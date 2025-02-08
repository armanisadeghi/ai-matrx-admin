import { Slider, Label } from '@/components/ui';
import { withBrokerInput, withBrokerCustomInput } from '../components/withBrokerInput';

export const BrokerSlider = withBrokerInput(({ value, onChange, inputComponent }) => {
    const showValue = inputComponent.additionalParams?.showValue ?? true;
    const prefix = inputComponent.additionalParams?.valuePrefix ?? '';
    const suffix = inputComponent.additionalParams?.valueSuffix ?? '';
    const min = inputComponent.min ?? 0;
    const max = inputComponent.max ?? 100;

    return (
        <div className='space-y-2'>
            {showValue && (
                <div className='flex justify-end'>
                    <span className='text-md text-muted-foreground font-bold'>
                        {prefix}
                        {value ?? min}
                        {suffix}
                    </span>
                </div>
            )}
            <div className='relative flex items-center'>
                <span className='absolute left-0 text-sm font-bold text-muted-foreground'>
                    {prefix}
                    {min}
                    {suffix}
                </span>
                <Slider
                    value={[value ?? min]}
                    onValueChange={([val]) => onChange(val)}
                    min={min}
                    max={max}
                    step={inputComponent.step ?? 1}
                    className='mx-12'
                />
                <span className='absolute right-0 text-sm font-bold text-muted-foreground'>
                    {prefix}
                    {max}
                    {suffix}
                </span>
            </div>
        </div>
    );
});


export const BrokerCustomSlider = withBrokerCustomInput(({ value, onChange, broker, inputComponent }) => {
    const showValue = inputComponent.additionalParams?.showValue ?? true;
    const prefix = inputComponent.additionalParams?.valuePrefix ?? '';
    const suffix = inputComponent.additionalParams?.valueSuffix ?? '';
    const min = inputComponent.min ?? 0;
    const max = inputComponent.max ?? 100;

    return (
        <div className='space-y-2'>
            <div className='flex items-center justify-between'>
                <Label>{inputComponent.name}</Label>
                {showValue && (
                    <span className='text-md text-muted-foreground font-bold'>
                        {prefix}
                        {value ?? min}
                        {suffix}
                    </span>
                )}
            </div>
            <div className='relative flex items-center'>
                <span className='absolute left-0 text-sm font-bold text-muted-foreground'>
                    {prefix}
                    {min}
                    {suffix}
                </span>
                <Slider
                    value={[value ?? min]}
                    onValueChange={([val]) => onChange(val)}
                    min={min}
                    max={max}
                    step={inputComponent.step ?? 1}
                    className='mx-12'
                />
                <span className='absolute right-0 text-sm font-bold text-muted-foreground'>
                    {prefix}
                    {max}
                    {suffix}
                </span>
            </div>
            {inputComponent.description && <p className='text-sm text-muted-foreground'>{inputComponent.description}</p>}
        </div>
    );
});
