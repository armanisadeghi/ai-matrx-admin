import {AllEntityFieldKeys, AnyEntityDatabaseTable, EntityKeys, Relationship} from "@/types/entityTypes";
import React from 'react';
import {DisplayFieldMetadata, PrimaryKeyMetadata} from "@/lib/redux/entity/types/stateTypes";
import {TargetAndTransition, VariantLabels} from "framer-motion";
import {DataStructure, FieldDataOptionsType} from "@/types/AutomationSchemaTypes";
import {EntityStateField} from "@/lib/redux/entity/types/stateTypes";


interface UISchemaField {
    name: string;
    type: string;
    editable: boolean;
    validation?: object;
    relatedField?: string;
}

interface UISchema {
    table: string;
    fields: UISchemaField[];
}

interface UIState {
    currentSchema: UISchema | null;
    data: Record<string, any>[];
    loading: boolean;
    errors: string[];
}


interface EntityMetadata {
    displayName: string;
    schemaType: string;
    primaryKeyMetadata: PrimaryKeyMetadata;
    displayFieldMetadata: DisplayFieldMetadata;
    displayField?: string;
    entityFields: Record<string, EntityStateField>;
    relationships: Relationship[];
}




interface BaseComponentProps {
    className?: string
    variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'destructive'
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon'
    fullWidth?: boolean
    hidden?: boolean
    readonly?: boolean
}

interface AnimationProps {
    initial?: VariantLabels | TargetAndTransition
    animate?: VariantLabels | TargetAndTransition
    exit?: VariantLabels | TargetAndTransition
    transition?: any
    animationPreset?: 'fadeIn' | 'slideIn' | 'scale' | 'none'
    animationDelay?: number
    animationDuration?: number
}

interface EventHandlerProps {
    onClick?: (event: React.MouseEvent) => void
    onFocus?: (event: React.FocusEvent) => void
    onBlur?: (event: React.FocusEvent) => void
    onHover?: (event: React.MouseEvent) => void
    onValueChange?: (value: any) => void
}

interface DynamicComponentProps extends
    BaseComponentProps,
    AnimationProps,
    EventHandlerProps {
    children?: React.ReactNode
    ref?: React.Ref<any>
    as?: keyof React.ComponentType<any>
    data?: any
    loading?: boolean
    error?: string
    customStyles?: Record<string, string>
}

type ComponentProps = {
    variant: string;
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
    [key: string]: string;
};
