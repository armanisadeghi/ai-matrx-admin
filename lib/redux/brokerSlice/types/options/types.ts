export interface FieldOption {
    id: string;
    label: string;
    description?: string;
    helpText?: string;
    iconName?: string;
    parentId?: string;
    metadata?: any;
  }
  
  export interface FieldOptionsRuntime extends FieldOption {
    isSelected: boolean;
    otherText: string;
  }