import {FormFieldType} from "@/types/AnimatedFormTypes";

export type ButtonVariant = "default" | "primary" | 'success' | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon" | "m" | "l" | "xl";
export type MatrxVariant = 'default' | 'destructive' |  'success' | 'outline' | 'secondary' | 'ghost' | 'link' | 'primary';


export interface EntityField {
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

export interface FormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}
