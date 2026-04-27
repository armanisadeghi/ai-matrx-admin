import EntityFormMinimal from "./EntityFormMinimal";
import EntityFormStandard from "./EntityFormStandard";
import EntityMultiSelectForms from "./EntityMultiSelectForms";
import ArmaniFormFinal from "./ArmaniFormFinal";
import EntityFormRecordSelections from "./EntityFormRecordSelections";
import ArmaniFormSmart from "@/components/matrx/ArmaniForm/smart-form/ArmaniFormSmart";
import ArmaniForm from "@/components/matrx/ArmaniForm/ArmaniForm";
import type { EntityFormType } from "@/types/componentConfigTypes";

export type { EntityFormType };

export const ENTITY_FORM_COMPONENTS = {
  DEFAULT: EntityFormStandard,
  STANDARD: EntityFormStandard,
  ARMANI: ArmaniFormFinal,
  ARMANI_LAYOUT: ArmaniForm,
  ARMANI_SMART: ArmaniFormSmart,
  MINIMAL: EntityFormMinimal,
  RECORD_SELECT: EntityFormRecordSelections,
  RECORD_MULTI_SELECT: EntityMultiSelectForms,
} as const;

export const getEntityFormComponent = (name: EntityFormType) =>
  ENTITY_FORM_COMPONENTS[name] || ENTITY_FORM_COMPONENTS.DEFAULT;
