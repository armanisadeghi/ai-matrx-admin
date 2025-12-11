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
import { VariableCustomComponent } from '@/features/prompts/types/core';
import { formatText } from '@/utils/text/text-case-converter';
import { Label } from '@/components/ui/label';

interface VariableInputComponentProps {
  value: string;
  onChange: (value: string) => void;
  variableName: string;
  customComponent?: VariableCustomComponent;
  onRequestClose?: () => void;
  helpText?: string;
  compact?: boolean;
}

/**
 * Renders the appropriate input component based on customComponent configuration
 */
export function VariableInputComponent({ 
  value, 
  onChange, 
  variableName,
  customComponent,
  onRequestClose,
  helpText,
  compact = false
}: VariableInputComponentProps) {
  const formattedName = formatText(variableName);
  
  // Render the input component
  let inputComponent: React.ReactNode;
  
  // Default to textarea if no custom component specified
  if (!customComponent || customComponent.type === 'textarea') {
    inputComponent = (
      <TextareaInput 
        value={value}
        onChange={onChange}
        variableName={formattedName}
        onRequestClose={onRequestClose}
        compact={compact}
      />
    );
  } else {
    // Render based on component type
    switch (customComponent.type) {
      case 'toggle':
        const [offLabel = 'No', onLabel = 'Yes'] = customComponent.toggleValues || [];
        inputComponent = (
          <ToggleInput
            value={value}
            onChange={onChange}
            offLabel={offLabel}
            onLabel={onLabel}
            variableName={formattedName}
            compact={compact}
          />
        );
        break;
        
      case 'radio':
        if (!customComponent.options || customComponent.options.length === 0) {
          inputComponent = <TextareaInput value={value} onChange={onChange} variableName={formattedName} onRequestClose={onRequestClose} compact={compact} />;
        } else {
          inputComponent = (
            <RadioGroupInput
              value={value}
              onChange={onChange}
              options={customComponent.options}
              variableName={formattedName}
              allowOther={customComponent.allowOther}
              compact={compact}
            />
          );
        }
        break;
        
      case 'checkbox':
        if (!customComponent.options || customComponent.options.length === 0) {
          inputComponent = <TextareaInput value={value} onChange={onChange} variableName={formattedName} onRequestClose={onRequestClose} compact={compact} />;
        } else {
          inputComponent = (
            <CheckboxGroupInput
              value={value}
              onChange={onChange}
              options={customComponent.options}
              variableName={formattedName}
              allowOther={customComponent.allowOther}
              compact={compact}
            />
          );
        }
        break;
        
      case 'select':
        if (!customComponent.options || customComponent.options.length === 0) {
          inputComponent = <TextareaInput value={value} onChange={onChange} variableName={formattedName} onRequestClose={onRequestClose} compact={compact} />;
        } else {
          inputComponent = (
            <SelectInput
              value={value}
              onChange={onChange}
              options={customComponent.options}
              variableName={formattedName}
              allowOther={customComponent.allowOther}
              compact={compact}
            />
          );
        }
        break;
        
      case 'number':
        inputComponent = (
          <NumberInput
            value={value}
            onChange={onChange}
            min={customComponent.min}
            max={customComponent.max}
            step={customComponent.step}
            variableName={formattedName}
            compact={compact}
          />
        );
        break;
        
      default:
        inputComponent = (
          <TextareaInput 
            value={value}
            onChange={onChange}
            variableName={formattedName}
            onRequestClose={onRequestClose}
            compact={compact}
          />
        );
    }
  }
  
  // Wrap with header showing variable name and optional help text
  return (
    <div className={compact ? "space-y-0.5" : "space-y-1.5"}>
      {/* Standard mode: Label and help text stacked */}
      {!compact && (
        <div>
          <Label className="text-sm font-medium">{formattedName}</Label>
          {helpText && (
            <p className="text-xs text-muted-foreground mt-0.5">{helpText}</p>
          )}
        </div>
      )}
      
      {/* Compact mode: Single line with minimal spacing */}
      {compact && (
        <div className="flex items-center gap-1.5">
          <Label className="text-xs font-medium pb-1">{formattedName}</Label>
          {helpText && (
            <span className="text-[11px] text-muted-foreground">· {helpText}</span>
          )}
        </div>
      )}
      
      {/* Input component */}
      {inputComponent}
    </div>
  );
}

