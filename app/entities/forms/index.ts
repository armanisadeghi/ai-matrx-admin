// app/entities/forms/index.ts

import EntityFormMinimal from './dev/EntityFormMinimal';
import EntityFormStandard from './EntityFormStandard';
import EntityMultiSelectForms from './dev/EntityMultiSelectForms';
import ArmaniFormFinal from './dev/ArmaniFormFinal';
import EntityFormRecordSelections from './EntityFormRecordSelections';

export const ENTITY_FORM_COMPONENTS = {
    DEFAULT: EntityFormStandard,
    STANDARD: EntityFormStandard,
    ARMANI: ArmaniFormFinal,
    MINIMAL: EntityFormMinimal,
    RECORD_SELECT: EntityFormRecordSelections,
    RECORD_MULTI_SELECT: EntityMultiSelectForms,
} as const;

export type EntityFormType = keyof typeof ENTITY_FORM_COMPONENTS;

export const getEntityFormComponent = (name: EntityFormType) => ENTITY_FORM_COMPONENTS[name] || ENTITY_FORM_COMPONENTS.DEFAULT;
