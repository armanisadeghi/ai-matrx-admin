import { TailwindColor } from "@/constants/rich-text-constants";
import { BrokerComponentType } from "./value-components";

// Core types matching our database schema
export type DataType = 'list' | 'url' | 'str' | 'bool' | 'dict' | 'float' | 'int';

export type DataBroker = {
    id: string;
    name: string;
    defaultValue: any;
    dataType: DataType;
    inputComponent: string; // FK to DataInputComponent.id
    outputComponent: string; // FK to DataOutputComponent.id
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


export type Size = '3xs' | '2xs' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'default';
export type ComponentOrientation = 'horizontal' | 'vertical' | 'default';


export type DataInputComponent = {
    id: string;
    name?: string;
    description?: string;
    placeholder?: string;
    component: BrokerComponentType;
    containerClassName?: string;
    collapsibleClassName?: string;
    labelClassName?: string;
    descriptionClassName?: string;
    componentClassName?: string;


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
    
    size?: Size;
    height?: Size;
    width?: Size;
    
    minHeight?: Size;
    maxHeight?: Size;
    minWidth?: Size;
    maxWidth?: Size;
    
    orientation?: ComponentOrientation;
};

export type DataInputBaseProps = {
    id: string;
    name?: string;
    description?: string;
    placeholder?: string;
    component: BrokerComponentType;
    containerClassName?: string;
    collapsibleClassName?: string;
    labelClassName?: string;
    descriptionClassName?: string;
    componentClassName?: string;
}

export type Option = {
    label: string;
    value: string;
};


export type BrokerCheckboxType = DataInputBaseProps & {
    options?: Option[];
    includeOther?: boolean;
    orientation?: ComponentOrientation;
};


export type BrokerColorPickerType = DataInputBaseProps;

export type BrokerInputType = DataInputBaseProps & {
    placeholder?: string;
    additionalParams?: {
        type?: string;
        validation?: {
            pattern: string;
            message?: string;
        };
    };
};

export type BrokerNumberInputType = DataInputBaseProps & {
    min?: number;
    max?: number;
    step?: number;
};

export type BrokerNumberPickerType = DataInputBaseProps & {
    min?: number;
    max?: number;
    step?: number;
};

export type BrokerRadioGroupType = DataInputBaseProps & {
    options?: Option[];
    includeOther?: boolean;
    orientation?: ComponentOrientation;
};


export type BrokerSelectType = DataInputBaseProps & {
    options?: Option[];
    includeOther?: boolean;
    additionalParams?: {
        placeholder?: string;
    };
};

export type BrokerCustomSelectType = DataInputBaseProps & {
    options?: Option[];
    includeOther?: boolean;
};

export type BrokerSliderType = DataInputBaseProps & {
    min?: number;
    max?: number;
    step?: number;
    additionalParams?: {
        showValue?: boolean;
        valuePrefix?: string;
        valueSuffix?: string;
    };
};

export type BrokerCustomSliderType = BrokerSliderType;

export type BrokerSwitchType = DataInputBaseProps & {
    additionalParams?: {
        labelPosition?: 'left' | 'right';
    };
};

export type BrokerCustomSwitchType = BrokerSwitchType;

export type BrokerTailwindColorPickerType = DataInputBaseProps & {
    value?: TailwindColor;
};


export type BrokerTextareaType = DataInputBaseProps & {
    placeholder?: string;
};

export type BrokerTextareaGrowType = DataInputBaseProps & {
    placeholder?: string;
    minHeight?: Size;
};

export type BrokerTextArrayInputType = DataInputBaseProps & {
    placeholder?: string;
    additionalParams?: {
        chipClassName?: string;
    };
};


