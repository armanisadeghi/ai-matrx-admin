import type { EntityKeys } from "@/types/entityTypes";
import type {
  EntityStateField,
  MatrxRecordId,
} from "@/lib/redux/entity/types/stateTypes";
import type {
  DynamicLayoutOptions,
  DynamicStyleOptions,
} from "@/components/matrx/Entity/prewired-components/layouts/types";

/**
 * Shared with SimpleForm / SimpleRelationshipWrapper and Smart* field components
 * to avoid circular imports between those modules.
 */
export interface FormState {
  [key: string]: any;
}

export interface SmartComponentProps {
  entityKey: EntityKeys;
  matrxRecordId: MatrxRecordId;
  fieldInfo: EntityStateField;
  primaryEntityKey: EntityKeys;
  primaryActiveRecordId: MatrxRecordId | null;
  foreignActiveRecordIds: Record<EntityKeys, MatrxRecordId> | null;
  formMode: "display" | "create" | "edit" | "view";
  onSubmitUpdate?: (data: FormState) => void;
  onSubmitCreate?: (data: FormState) => void;
  onSubmitDelete?: () => void;
  dynamicLayoutOptions: DynamicLayoutOptions;
  dynamicStyles: DynamicStyleOptions;
}
