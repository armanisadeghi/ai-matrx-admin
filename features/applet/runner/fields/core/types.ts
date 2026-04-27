import { FieldDefinition } from "@/types/customAppTypes";

export interface CommonFieldProps {
  field: FieldDefinition;
  sourceId: string;
  isMobile?: boolean;
  source?: string;
  disabled?: boolean;
  className?: string;
}
