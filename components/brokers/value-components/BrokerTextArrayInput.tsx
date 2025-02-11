import { withBrokerInput } from '../wrappers/withMockBrokerInput';
import TextArrayInput from '@/components/ui/matrx/TextArrayInput';

export const BrokerTextArrayInput = withBrokerInput(({ 
    value, 
    onChange, 
    inputComponent 
}) => {
    const arrayValue = Array.isArray(value) ? value : (value ? [value] : []);
        const chipClassName = inputComponent.additionalParams?.chipClassName;

    return (
        <TextArrayInput
            value={arrayValue}
            onChange={onChange}
            placeholder={inputComponent.placeholder}
            showCopyIcon={false}
            chipClassName={chipClassName}
            className="w-full"
        />
    );
});

export default BrokerTextArrayInput;