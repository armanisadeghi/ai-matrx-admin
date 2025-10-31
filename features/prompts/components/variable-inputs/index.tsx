/**
 * Variable Input Components
 * 
 * Custom input components for prompt variables that all return text values
 */

export { ToggleInput } from './ToggleInput';
export { RadioGroupInput } from './RadioGroupInput';
export { CheckboxGroupInput } from './CheckboxGroupInput';
export { SelectInput } from './SelectInput';
export { NumberInput } from './NumberInput';
export { TextareaInput } from './TextareaInput';

import { ToggleInput } from './ToggleInput';
import { RadioGroupInput } from './RadioGroupInput';
import { CheckboxGroupInput } from './CheckboxGroupInput';
import { SelectInput } from './SelectInput';
import { NumberInput } from './NumberInput';
import { TextareaInput } from './TextareaInput';
import { VariableCustomComponent } from '../../types/variable-components';
import { formatText } from '@/utils/text/text-case-converter';

interface VariableInputComponentProps {
  value: string;
  onChange: (value: string) => void;
  variableName: string;
  customComponent?: VariableCustomComponent;
}

/**
 * Renders the appropriate input component based on customComponent configuration
 */
export function VariableInputComponent({ 
  value, 
  onChange, 
  variableName,
  customComponent 
}: VariableInputComponentProps) {
  const formattedName = formatText(variableName);
  
  // Default to textarea if no custom component specified
  if (!customComponent || customComponent.type === 'textarea') {
    return (
      <TextareaInput 
        value={value}
        onChange={onChange}
        variableName={formattedName}
      />
    );
  }
  
  // Render based on component type
  switch (customComponent.type) {
    case 'toggle':
      const [offLabel = 'No', onLabel = 'Yes'] = customComponent.toggleValues || [];
      return (
        <ToggleInput
          value={value}
          onChange={onChange}
          offLabel={offLabel}
          onLabel={onLabel}
          variableName={formattedName}
        />
      );
      
    case 'radio':
      if (!customComponent.options || customComponent.options.length === 0) {
        return <TextareaInput value={value} onChange={onChange} variableName={formattedName} />;
      }
      return (
        <RadioGroupInput
          value={value}
          onChange={onChange}
          options={customComponent.options}
          variableName={formattedName}
        />
      );
      
    case 'checkbox':
      if (!customComponent.options || customComponent.options.length === 0) {
        return <TextareaInput value={value} onChange={onChange} variableName={formattedName} />;
      }
      return (
        <CheckboxGroupInput
          value={value}
          onChange={onChange}
          options={customComponent.options}
          variableName={formattedName}
        />
      );
      
    case 'select':
      if (!customComponent.options || customComponent.options.length === 0) {
        return <TextareaInput value={value} onChange={onChange} variableName={formattedName} />;
      }
      return (
        <SelectInput
          value={value}
          onChange={onChange}
          options={customComponent.options}
          variableName={formattedName}
        />
      );
      
    case 'number':
      return (
        <NumberInput
          value={value}
          onChange={onChange}
          min={customComponent.min}
          max={customComponent.max}
          step={customComponent.step}
          variableName={formattedName}
        />
      );
      
    default:
      return (
        <TextareaInput 
          value={value}
          onChange={onChange}
          variableName={formattedName}
        />
      );
  }
}

