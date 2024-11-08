// components/matrx/Entity/types/entityForm.ts

import {EntityNameOfficial} from "@/types/schema";
import {TypeBrand} from "@/types/entityTypes";

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
    | 'map'
    | 'set'
    | 'tuple'
    | 'enum'
    | 'intersection'
    | 'literal'
    | 'void'
    | 'never';

export type DataStructure =
    | 'single'
    | 'array'
    | 'object'
    | 'foreignKey'
    | 'inverseForeignKey'
    | 'manyToMany';

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
}



export interface EntityFormState {
    [key: string]: any;
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


interface EntityField {
    name: string;
    displayName: string;
    isPrimary?: boolean;
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
