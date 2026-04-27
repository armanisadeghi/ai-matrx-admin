import type { ChangeEvent } from "react";
import type { MatrxVariant } from "@/components/ui/types";

/**
 * Shared types and config for number handlers + EntityNumberInput
 * to avoid circular imports (handlers previously imported from EntityNumberInput).
 */

export type NumberType =
  | "default"
  | "smallint"
  | "integer"
  | "bigint"
  | "decimal"
  | "real"
  | "double"
  | "serial"
  | "bigserial";

export const NUMBER_TYPE_CONFIGS = {
  default: { min: -2147483648, max: 2147483647, step: 1 },
  smallint: { min: -32768, max: 32767, step: 1 },
  integer: { min: -2147483648, max: 2147483647, step: 1 },
  bigint: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER, step: 1 },
  decimal: { min: -999999999999.999999, max: 999999999999.999999, step: 0.000001, decimals: 6 },
  real: { min: -3.4e38, max: 3.4e38, step: 0.000001, decimals: 6 },
  double: { min: -1.7e308, max: 1.7e308, step: 0.000001, decimals: 15 },
  serial: { min: 1, max: 2147483647, step: 1 },
  bigserial: { min: 1, max: Number.MAX_SAFE_INTEGER, step: 1 },
} as const;

export interface NumberTypeConfig {
  min: number;
  max: number;
  step: number;
  decimals?: number;
}

export interface NumberHandlerResult {
  displayValue: string;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleIncrement: () => void;
  handleDecrement: () => void;
  handleBlur: () => void;
  error: string;
  isDecrementDisabled?: boolean;
}

export interface NumberHandlerProps {
  value: number | null;
  onChange: (value: number | null) => void;
  config: NumberTypeConfig;
}

export const INTEGER_TYPES = ["default", "smallint", "integer"] as const;
export const DECIMAL_TYPES = ["decimal", "real", "double"] as const;
export const SERIAL_TYPES = ["serial", "bigserial"] as const;
export const BIGINT_TYPES = ["bigint"] as const;

export interface ComponentCustomProps extends Record<string, unknown> {
  numberType?: NumberType;
  hideControls?: boolean;
  buttonVariant?: MatrxVariant;
  allowNull?: boolean;
  min?: number | "default";
  max?: number | "default";
  step?: number | "default";
  decimals?: number | "default";
}
