import { FieldOption } from "@/types/customAppTypes";

export interface SelectedOptionValue extends FieldOption {
  selected: boolean;
  otherText?: string;
}
