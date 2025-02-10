import { BrokerComponentType } from "./value-components";

// Core types matching our database schema
type DataType = 'list' | 'url' | 'str' | 'bool' | 'dict' | 'float' | 'int';

export type DataBroker = {
    id: string;
    name: string;
    defaultValue: any;
    dataType: DataType;
    inputComponent: string; // FK to DataInputComponent.id
    outputComponent: string; // FK to DataOutputComponent.id
};

export type Size = '3xs' | '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'default';


export type DataInputComponent = {
    id: string;
    name?: string;
    description?: string;
    placeholder?: string;
    options?: { label: string; value: any }[];
    includeOther?: boolean;
    min?: number;
    max?: number;
    step?: number;
    acceptableFiletypes?: any;
    src?: string;
    colorOverrides?: any;
    additionalParams?: any;
    subComponent?: string;
    component: BrokerComponentType;
    containerClassName?: string;
    collapsibleClassName?: string;
    labelClassName?: string;
    descriptionClassName?: string;
    componentClassName?: string;
    size?: Size;
    height?: Size;
    width?: Size;
    minHeight?: Size;
    maxHeight?: Size;
    minWidth?: Size;
    maxWidth?: Size;
    orientation?: 'horizontal' | 'vertical' | 'default';
};

export type BrokerValue = {
    id: string; // UUID (Primary Key)
    userId: string | null; // UUID (Foreign Key referencing auth.users)
    dataBroker: string | null; // UUID (Foreign Key referencing data_broker)
    data: Record<string, unknown> | null; // JSONB field, default {"value": null}
    category: string | null; // VARCHAR (nullable)
    subCategory: string | null; // VARCHAR (nullable)
    tags: string[] | null; // Array of text
    comments: string | null; // Nullable text
    createdAt: string; // TIMESTAMP WITH TIME ZONE (auto-generated)
};
