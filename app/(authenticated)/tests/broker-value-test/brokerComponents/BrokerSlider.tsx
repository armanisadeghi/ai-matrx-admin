import { Slider, Label } from '@/components/ui';
import { withBrokerInput } from '../components/withBrokerInput';
import { cn } from '@/utils';

export const BrokerSlider = withBrokerInput(({ value, onChange, broker, inputComponent }) => {
    return (
        <>
            <Label>{inputComponent.name}</Label>
            <Slider
                value={[value ?? inputComponent.min ?? 0]}
                onValueChange={([val]) => onChange(val)}
                min={inputComponent.min ?? 0}
                max={inputComponent.max ?? 100}
                step={inputComponent.step ?? 1}
            />
            {inputComponent.description && <p className='text-sm text-muted-foreground'>{inputComponent.description}</p>}
        </>
    );
});
