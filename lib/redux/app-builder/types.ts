import { CustomAppConfig, CustomApplet } from "@/features/applet/builder/builder.types";

export type ComponentType =
    | "input"
    | "textarea"
    | "select"
    | "multiselect"
    | "radio"
    | "checkbox"
    | "slider"
    | "number"
    | "date"
    | "switch"
    | "button"
    | "rangeSlider"
    | "numberPicker"
    | "jsonField"
    | "fileUpload";

export interface FieldOption {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    iconName?: string;
}

export interface ComponentProps {
    min?: number;
    max?: number;
    step?: number;
    rows?: number;
    minDate?: string;
    maxDate?: string;
    onLabel?: string;
    offLabel?: string;
}

export interface FieldDefinition {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    group?: string;
    iconName?: string;
    component: ComponentType;
    required?: boolean;
    disabled?: boolean;
    placeholder?: string;
    defaultValue?: any;
    options?: FieldOption[];
    componentProps: ComponentProps;
    includeOther?: boolean;
}

export interface FieldBuilder extends FieldDefinition {
    isPublic?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
}

export type AppletContainer = {
    id: string;
    label: string;
    shortLabel?: string;
    description?: string;
    hideDescription?: boolean;
    helpText?: string;
    fields: FieldDefinition[];
};

export interface ContainerBuilder extends AppletContainer {
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
}

export interface AppletBuilder extends CustomApplet {
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    isDirty?: boolean;
    isLocal?: boolean;
    slugStatus?: 'unchecked' | 'unique' | 'notUnique';
}

export interface AppBuilder extends CustomAppConfig {
    appletIds: string[];
    isDirty?: boolean;
    isLocal?: boolean;
    slugStatus?: 'unchecked' | 'unique' | 'notUnique';
}

export interface CustomActionButton {
    label: string;
    actionType: string;
    knownMethod: string;
}

export interface BrokerMapping {
    appletId: string;
    fieldId: string;
    brokerId: string;
}

export interface RuntimeBrokerDefinition {
    id: string;
    name: string;
    dataType: string;
    defaultValue?: any;
}