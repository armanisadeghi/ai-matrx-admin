// File: "@/features/applet/utils/field-normalization.ts"

import { FieldBuilder } from "@/lib/redux/app-builder/types";
import { FieldDefinition, ComponentProps, ComponentType, FieldOption } from "@/types/customAppTypes";
import { getComponentTypeDefaults, ensureValidWidthClass, ensureValidDirectionValue, ensureValidGridColsValue } from "@/features/applet/constants/field-constants";
import { FIELD_DEFAULT_COMPONENT_PROPS } from "@/lib/redux/app-builder/slices/fieldBuilderSlice";

export function processFieldOptions(options?: FieldOption[]): FieldOption[] {
    if (!options || options.length === 0) {
      return [];
    }
    return options.map(option => ({
      ...option,
      description: option.description?.trim() || option.label
    }));
}

export function normalizeFieldDefinition(field: Partial<FieldDefinition> | Partial<FieldBuilder>): FieldDefinition {
    const componentType = field.component || "textarea";
    const typeDefaultProps = getComponentTypeDefaults(componentType as ComponentType);

    const mergedComponentProps = {
        ...FIELD_DEFAULT_COMPONENT_PROPS,
        ...typeDefaultProps,
        ...(field.componentProps || {}),
    };

    mergedComponentProps.width = ensureValidWidthClass(mergedComponentProps.width);
    mergedComponentProps.direction = ensureValidDirectionValue(mergedComponentProps.direction);
    mergedComponentProps.gridCols = ensureValidGridColsValue(mergedComponentProps.gridCols);

    return {
        id: field.id || "temp-id",
        label: field.label || "Untitled Field",
        description: field.description || "",
        helpText: field.helpText || "",
        group: field.group || "default",
        iconName: field.iconName || "",
        component: componentType as ComponentType,
        required: field.required !== undefined ? field.required : false,
        placeholder: field.placeholder || "",
        defaultValue: field.defaultValue !== undefined ? field.defaultValue : "",
        options: processFieldOptions(field.options || []),
        componentProps: mergedComponentProps,
        includeOther: field.includeOther !== undefined ? field.includeOther : false,
    };
}