import React from 'react';
import {
    MatrxDatePicker,
    MatrxDateRangePicker,
    MatrxDatePickerWithPresets
} from '@/components/ui';
import {format, isValid, parse} from 'date-fns';
import {CalendarIcon} from "lucide-react";
import {MatrxVariant} from './types';
import {TypeBrand} from "@/types/entityTypes";
import {DataStructure, FieldDataOptionsType, FormFieldType} from "@/components/matrx/Entity/types/entityForm";
import {generateClass, getValidVariant, parseDate, parsePresetOptions} from './helpers/component-utils';

// Types from our Matrx components
interface PresetOption {
    label: string;
    value: number;
}

type DateRange = {
    from: Date;
    to: Date;
};

export interface EntityFlexFormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    section?: string;
    min?: number;
    max?: number;
    step?: number;
    accept?: string;
    multiple?: boolean;
    src?: string;
    alt?: string;
    jsonSchema?: object;
    actionKeys?: string[];
    actionProps?: any;
    inlineFields?: object[]; // TODO: Type this correctly.
    defaultValue?: any;
    validationFunctions?: string[];
    maxLength?: number;
    defaultComponent?: string;
    subComponent?: string;
    componentProps?: Record<string, unknown>;
    isPrimaryKey?: boolean;
    isDisplayField?: boolean;
    isRequired?: boolean;
    isNative?: boolean;
    dataType?: FieldDataOptionsType;
    isArray?: boolean;
    structure?: DataStructure;
    typeReference?: TypeBrand<any>;
    defaultGeneratorFunction?: string;
    exclusionRules?: string[];
}


// System-provided props interface
interface EntityCommonProps {
    name: string;
    displayName: string;
    value: any;
    onChange?: (value: any) => void;
    onBlur?: (value: any) => void;
    onFocus?: (value: any) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onKeyUp?: (event: KeyboardEvent) => void;
    onSelect?: (value: any) => void;
    onInput?: (event: InputEvent) => void;
    description?: string;
    actionKeys?: string[];
    actionProps?: any;
    inlineFields?: object[];
    disabled?: boolean;
    readOnly?: boolean;
    componentProps: {
        subComponent: string;
        variant: MatrxVariant;
        placeholder: string;
        size: string;
        textSize: string;
        textColor: string;
        rows: string;
        animation: string;
        fullWidthValue: string;
        fullWidth: string;
        disabled: string;
        className: string;
        type: string;
        onChange: string;
        formatString: string;
        minDate: string;
        maxDate: string;
        presets?: string;
        numberOfMonths?: string;
        [key: string]: any;
    };
    [key: string]: any;
}

// Default values
const defaultIcon = <CalendarIcon className="mr-2 h-4 w-4"/>;

const defaultPresets: PresetOption[] = [
    {label: "Today", value: 0},
    {label: "Tomorrow", value: 1},
    {label: "In 3 days", value: 3},
    {label: "In a week", value: 7}
];

export const EntityDatePicker: React.FC<EntityCommonProps> = (props) => {
    const { value, onChange, componentProps, displayName } = props;

    const variant: MatrxVariant = getValidVariant(props.componentProps.variant);
    const parsedValue = parseDate(value);
    const className = generateClass(componentProps);
    const presets = componentProps.presets ? parsePresetOptions(componentProps.presets, defaultPresets) : defaultPresets;
    const minDate = parseDate(componentProps.minDate);
    const maxDate = parseDate(componentProps.maxDate);
    const placeholder = componentProps.placeholder !== 'default' ? componentProps.placeholder : displayName;
    const disabled = componentProps.disabled !== 'default' && componentProps.disabled === 'true';
    const numberOfMonths = componentProps.numberOfMonths !== 'default' ? Number(componentProps.numberOfMonths) : 2;
    const formatString = componentProps.formatString !== 'default' ? componentProps.formatString
                                                                   : componentProps.subComponent === 'datetime' ? 'PPP HH:mm:ss' : 'PPP';

    const renderComponent = (): React.ReactElement => {
        switch (componentProps.subComponent) {
            case 'daterange':
                return (
                    <MatrxDateRangePicker
                        value={parsedValue ? { from: parseDate(value.from), to: parseDate(value.to) } : undefined}
                        onChange={onChange}
                        className={className}
                        variant={variant}
                        icon={defaultIcon}
                        align="start"
                        placeholder={placeholder}
                        numberOfMonths={numberOfMonths}
                        formatString={formatString}
                        disabled={disabled}
                        minDate={minDate}
                        maxDate={maxDate}
                    />
                );

            case 'datewithpresets':
                return (
                    <MatrxDatePickerWithPresets
                        value={parsedValue}
                        onChange={onChange}
                        className={className}
                        variant={variant}
                        icon={defaultIcon}
                        align="start"
                        placeholder={placeholder}
                        formatString={formatString}
                        disabled={disabled}
                        minDate={minDate}
                        maxDate={maxDate}
                        presets={presets}
                        presetPlaceholder="Quick select"
                    />
                );

            case 'datetime':
            case 'date':
            default:
                return (
                    <MatrxDatePicker
                        value={parsedValue}
                        onChange={onChange}
                        className={className}
                        variant={variant}
                        icon={defaultIcon}
                        align="start"
                        placeholder={placeholder}
                        formatString={formatString}
                        disabled={disabled}
                        minDate={minDate}
                        maxDate={maxDate}
                    />
                );
        }
    };

    return renderComponent();
};
