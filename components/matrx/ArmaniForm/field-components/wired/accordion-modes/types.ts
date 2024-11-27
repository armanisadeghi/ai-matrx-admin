import { EntityData, EntityKeys } from "@/types/entityTypes";
import { EntityStateField, MatrxRecordId } from "@/lib/redux/entity/types";
import {FormDensity} from "@/components/matrx/ArmaniForm/ArmaniForm";
import {AnimationPreset, TextSizeOptions} from "@/types/componentConfigTypes";
import {MatrxVariant} from "@/components/matrx/ArmaniForm/field-components/types";

export type ViewModeOptions = 'view' | 'edit' | 'create';

export interface ModeComponentProps {
    matrxRecordId: MatrxRecordId;
    record: EntityData<EntityKeys>;
    dynamicFieldInfo: EntityStateField[];
    displayField: string;
    entityKey: EntityKeys;
    onModeChange: (mode: ViewModeOptions, recordId?: MatrxRecordId) => void;
    expandedFields?: Record<string, boolean>;
    toggleFieldExpansion?: (fieldId: string) => void;
    form?: any;
    truncateText?: (text: string) => string;
}

export interface EntityInlineProps {
    entityKey: EntityKeys;
    dynamicFieldInfo: EntityStateField;
    value: any;
    onChange: (value: any) => void;
    density?: FormDensity;
    animationPreset?: AnimationPreset;
    size?: TextSizeOptions;
    className?: string;
    variant: MatrxVariant;
    floatingLabel?: boolean;
    formData: EntityData<EntityKeys>;
    activeEntityKey?: EntityKeys;
}

