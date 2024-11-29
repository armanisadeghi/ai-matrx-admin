// components/matrx/Entity/types/entityForm.ts

import {EntityNameOfficial} from "@/types/schema";
import {
    AllEntityFieldKeys,
    AnyEntityDatabaseTable,
    EntityKeys,
    ForeignKeyReference,
    TypeBrand
} from "@/types/entityTypes";
import {FormDensity, FormState} from "@/components/matrx/ArmaniForm/ArmaniForm";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";
import {ComponentProps, EntityStateField} from "@/lib/redux/entity/types/stateTypes";
import {AnimationPreset, EntityFormState} from "@/types/componentConfigTypes";

export type FormFieldType =
    'text'
    | 'email'
    | 'number'
    | 'select'
    | 'textarea'
    | 'checkbox'
    | 'radio'
    | 'password'
    | 'date'
    | 'time'
    | 'datetime-local'
    | 'month'
    | 'week'
    | 'tel'
    | 'url'
    | 'color'
    | 'slider'
    | 'switch'
    | 'json'
    | 'file'
    | 'image'
    | 'rating';

export type FieldDataOptionsType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'array'
    | 'object'
    | 'json'
    | 'null'
    | 'undefined'
    | 'any'
    | 'function'
    | 'symbol'
    | 'union'
    | 'bigint'
    | 'date'
    | 'datetime'
    | 'map'
    | 'set'
    | 'tuple'
    | 'enum'
    | 'intersection'
    | 'literal'
    | 'void'
    | 'never'
    | 'url';

export type DataStructure =
    | 'single'
    | 'array'
    | 'object'
    | 'foreignKey'
    | 'inverseForeignKey'
    | 'manyToMany';

interface FlexFormField {
    name: string;
    label: string;
    type: FormFieldType;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    section?: string;
    min?: number;
    max?: number;
    step?: number;


    // Unused or unnecessary props
    src?: string;  // Just Value
    alt?: string;  // Either can't know or settings or just the value
    jsonSchema?: object;  // Not sure the intent, but based on usage, it's likely something from the schema selectors
    multiple?: boolean; // I think this is an attempt at handling isArray
    options?: string[];  // I think this is an attempt at handling enums
    accept?: string;  // I think this is an attempt at handling file types

}

const sampleEntry = {
    fieldNameFormats: {
        "frontend": "parameters",
        "backend": "parameters",
        "database": "parameters",
        "pretty": "Parameters",
        "component": "Parameters",
        "kebab": "parameters",
        "sqlFunctionRef": "p_parameters",
        "RestAPI": "parameters",
        "GraphQL": "parameters",
        "custom": "parameters"
    } as const,
    dataType: 'object' as const,
    isRequired: false,
    maxLength: null,
    isArray: false,
    defaultValue: "" as const,
    isPrimaryKey: false,
    isDisplayField: false,
    defaultGeneratorFunction: "",
    validationFunctions: [],
    exclusionRules: [],
    defaultComponent: 'json' as const,
    componentProps: {
        "subComponent": "default",
        "variant": "default",
        "placeholder": "default",
        "size": "default",
        "textSize": "default",
        "textColor": "default",
        "rows": "default",
        "animation": "default",
        "fullWidthValue": "default",
        "fullWidth": "default",
        "disabled": "default",
        "className": "default",
        "type": "default",
        "onChange": "default",
        "onBlur": "default",
        "formatString": "default",
        "minDate": "default",
        "maxDate": "default",
        "numberType": "default"
    },
    structure: 'single' as const,
    isNative: true,
    typeReference: {} as TypeBrand<Record<string, unknown>>,
    enumValues: null,
    entityName: 'tool',
    databaseTable: 'tool',
    description: '"Parameters" field for tool. This is an optional field. Your entry must be an object data type.',
}

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

export interface EntityBaseFieldProps {
    entityKey: EntityKeys;
    value: any;
    onChange: (value: any) => void;
    density?: 'compact' | 'normal' | 'comfortable';
    animationPreset?: 'none' | 'subtle' | 'smooth' | 'energetic' | 'playful';
    size?: 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
    dynamicFieldInfo: {
        name: AllEntityFieldKeys;
        displayName: string;
        uniqueColumnId: string;
        uniqueFieldId: string;
        dataType: FieldDataOptionsType;
        isRequired: boolean;
        maxLength: number;
        isArray: boolean;
        defaultValue: any;
        isPrimaryKey: boolean;
        isDisplayField?: boolean;
        defaultGeneratorFunction: string;
        validationFunctions: string[];
        exclusionRules: string[];
        defaultComponent?: string;
        componentProps: ComponentProps;
        structure: DataStructure;
        isNative: boolean;
        typeReference: TypeBrand<any>;
        enumValues: string[];
        entityName: EntityKeys;
        databaseTable: AnyEntityDatabaseTable;
        foreignKeyReference: ForeignKeyReference | null;
        description: string;
    };
}




export interface EntityFlexFormField {
    name: string;
    label: string;
    type: FormFieldType;
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    section?: string;
    min?: number;
    max?: number;
    step?: number;

    // Potential for relationships, but probably a bit clunky
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

    // Unused or unnecessary props
    src?: string;  // Just Value
    alt?: string;  // Either can't know or settings or just the value
    jsonSchema?: object;  // Not sure the intent, but based on usage, it's likely something from the schema selectors
    multiple?: boolean; // I think this is an attempt at handling isArray
    options?: string[];  // I think this is an attempt at handling enums
    accept?: string;  // I think this is an attempt at handling file types
    [key: string]: any;

}








export interface FlexEntityFormProps {
    fields: EntityFlexFormField[];
    formState: FormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit?: () => void;
    onSubmitUpdate?: (data: FormState) => void;
    onSubmitCreate?: (data: FormState) => void;
    onSubmitDelete?: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
    className?: string;
    isFullPage?: boolean;
    columns?: number | 'auto' | { xs: number, sm: number, md: number, lg: number, xl: number };
    layout?: 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
    enableSearch?: boolean;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    density?: FormDensity;
    animationPreset?: AnimationPreset;
}


interface EntityField {
    name: string;
    displayName: string;
    isPrimaryKey?: boolean;
    isDisplayField?: boolean;
}

interface SchemaField {
    fieldName: string;
    entityName: EntityNameOfficial;
    dataType: FieldDataOptionsType;
    isArray: boolean;
    structure: DataStructure;
    isNative: boolean;
    typeReference: TypeBrand<any>;
    defaultComponent?: string;
    componentProps?: Record<string, unknown>;
    isRequired: boolean;
    maxLength: number;
    defaultValue: any;
    isPrimaryKey: boolean;
    isDisplayField?: boolean;
    defaultGeneratorFunction: string;
    validationFunctions: string[];
    exclusionRules: string[];
    databaseTable: string;
}


export interface EntityFormField {
    name: string;
    label: string;
    type: FormFieldType;
    options?: string[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
}

export type EntityModalFormState = EntityFormState;

export interface EntityFormProps {
    fields: EntityFormField[];
    formState: EntityFormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
}

export interface FlexEntityFormProps {
    fields: EntityFlexFormField[];
    formState: EntityFormState;
    onUpdateField: (name: string, value: any) => void;
    onSubmit: () => void;
    currentStep?: number;
    onNextStep?: () => void;
    onPrevStep?: () => void;
    isSinglePage?: boolean;
    className?: string;
    isFullPage?: boolean;
    columns?: number | 'auto' | { xs: number, sm: number, md: number, lg: number, xl: number };
    layout?: 'grid' | 'sections' | 'accordion' | 'tabs' | 'masonry' | 'carousel' | 'timeline';
    enableSearch?: boolean;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
}

// Keep other interfaces unchanged
export type ModalOnSubmit = (() => void) | ((formData: EntityFormState) => void);

export interface EntityFormModalProps extends Omit<Partial<EntityFormProps>, 'onSubmit'> {
    isOpen?: boolean;
    onClose?: () => void;
    onSubmit?: ModalOnSubmit;
    triggerButton?: React.ReactNode;
}

export interface TabButton {
    label: string;
    onClick: () => void;
    className?: string;
}

export interface TabData {
    value: string;
    label: string;
    fields: EntityFormField[];
    buttons?: TabButton[];
}

export interface EntityTabModalProps extends Partial<Omit<EntityFormProps, 'onSubmit'>> {
    isOpen?: boolean;
    onClose?: () => void;
    onSubmit?: ModalOnSubmit;
    triggerButton?: React.ReactNode;
    title?: string;
    description?: string;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    footer?: React.ReactNode;
    tabs?: TabData[];
    children?: React.ReactNode;
}
