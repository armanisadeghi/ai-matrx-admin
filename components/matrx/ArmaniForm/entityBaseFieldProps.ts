import { EntityKeys } from "@/types/entityTypes";
import { EntityStateField } from "@/lib/redux/entity/types/stateTypes";
import { MatrxVariant } from "@/components/matrx/ArmaniForm/field-components/types";
import {
  AnimationPreset,
  ComponentDensity,
  ComponentSize,
} from "@/types/componentConfigTypes";

/**
 * Extracted to a standalone module so field registries and field components
 * can share this contract without circular imports through EntityBaseField.
 */
export interface EntityBaseFieldProps {
  entityKey: EntityKeys;
  dynamicFieldInfo: EntityStateField;
  value?: any;
  onChange: (value: any) => void;
  density?: ComponentDensity;
  animationPreset?: AnimationPreset;
  size?: ComponentSize;
  variant?: MatrxVariant;
  labelPosition?: "default" | "left" | "right" | "top" | "bottom";
  disabled?: boolean;
  floatingLabel?: boolean;
  className?: string;
}
