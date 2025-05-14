import { FieldDefinition } from "@/types/customAppTypes";
import { FieldBuilder } from "@/lib/redux/app-builder/types";

/**
 * Compares a container field with its corresponding core field to detect differences
 * @param containerField The field from the container
 * @param coreField The field from the core database
 * @returns true if differences are found, false otherwise
 */
export const hasFieldDifferences = (
  containerField: FieldDefinition,
  coreField: FieldDefinition | FieldBuilder
): boolean => {
  if (!containerField || !coreField) return false;
  
  // Compare essential properties between container field and core field
  return (
    containerField.label !== coreField.label ||
    containerField.component !== coreField.component ||
    containerField.required !== coreField.required ||
    containerField.description !== coreField.description ||
    containerField.helpText !== coreField.helpText ||
    containerField.placeholder !== coreField.placeholder ||
    // Compare options array
    JSON.stringify(containerField.options || []) !== JSON.stringify(coreField.options || []) ||
    // Compare component properties
    JSON.stringify(containerField.componentProps || {}) !== JSON.stringify(coreField.componentProps || {})
  );
};

/**
 * Gets detailed differences between a container field and its core field
 * @param containerField The field from the container
 * @param coreField The field from the core database
 * @returns An object detailing the differences or null if fields are identical
 */
export const getFieldDifferences = (
  containerField: FieldDefinition,
  coreField: FieldDefinition | FieldBuilder
) => {
  if (!containerField || !coreField) return null;
  
  const differences: Record<string, { container: any; core: any }> = {};
  
  // Check each property for differences
  if (containerField.label !== coreField.label) {
    differences.label = { container: containerField.label, core: coreField.label };
  }
  
  if (containerField.component !== coreField.component) {
    differences.component = { container: containerField.component, core: coreField.component };
  }
  
  if (containerField.required !== coreField.required) {
    differences.required = { container: containerField.required, core: coreField.required };
  }
  
  if (containerField.description !== coreField.description) {
    differences.description = { container: containerField.description, core: coreField.description };
  }
  
  if (containerField.helpText !== coreField.helpText) {
    differences.helpText = { container: containerField.helpText, core: coreField.helpText };
  }
  
  if (containerField.placeholder !== coreField.placeholder) {
    differences.placeholder = { container: containerField.placeholder, core: coreField.placeholder };
  }
  
  // Compare options if they exist
  if (JSON.stringify(containerField.options || []) !== JSON.stringify(coreField.options || [])) {
    differences.options = { 
      container: containerField.options || [], 
      core: coreField.options || [] 
    };
  }
  
  // Compare component properties
  if (JSON.stringify(containerField.componentProps || {}) !== JSON.stringify(coreField.componentProps || {})) {
    differences.componentProps = { 
      container: containerField.componentProps || {}, 
      core: coreField.componentProps || {} 
    };
  }
  
  return Object.keys(differences).length > 0 ? {
    fieldId: containerField.id,
    fieldLabel: containerField.label,
    differences
  } : null;
}; 