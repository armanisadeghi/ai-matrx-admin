import { FieldDefinition } from "@/types/customAppTypes";
import { FieldBuilder } from "@/lib/redux/app-builder/types";

/**
 * Deep comparison function that ignores property order
 * @param obj1 First object to compare
 * @param obj2 Second object to compare
 * @returns true if objects are deeply equal, false otherwise
 */
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (obj1 == null || obj2 == null) return obj1 === obj2;
  
  if (typeof obj1 !== typeof obj2) return false;
  
  if (typeof obj1 !== 'object') return obj1 === obj2;
  
  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
  
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

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
    // Compare options array using deep comparison
    !deepEqual(containerField.options || [], coreField.options || []) ||
    // Compare component properties using deep comparison
    !deepEqual(containerField.componentProps || {}, coreField.componentProps || {})
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
  if (!deepEqual(containerField.options || [], coreField.options || [])) {
    differences.options = { 
      container: containerField.options || [], 
      core: coreField.options || [] 
    };
  }
  
  // Compare component properties
  if (!deepEqual(containerField.componentProps || {}, coreField.componentProps || {})) {
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