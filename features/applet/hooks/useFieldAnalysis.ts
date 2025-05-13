import { useMemo } from "react";
import { FieldDefinition } from "@/types/customAppTypes";
import { FieldBuilder } from "@/lib/redux/app-builder/types";
import { hasFieldDifferences, getFieldDifferences } from "@/features/applet/utils/fieldComparison";

interface FieldAnalysisResult {
  coreFieldsForOurFields: Array<FieldDefinition | FieldBuilder>;
  fieldsNotInCoreFields: FieldDefinition[];
  dirtyCoreFieldsForOurFields: Array<FieldDefinition | FieldBuilder>;
  fieldsDifferentFromCoreField: FieldDefinition[];
  fieldDifferencesDetails: Array<{
    fieldId: string;
    fieldLabel: string;
    differences: Record<string, { container: any; core: any }>;
  } | null>;
}

/**
 * Hook to analyze field differences between container fields and core database fields
 * 
 * @param containerFields Fields from the container
 * @param allCoreFields All core database fields
 * @returns Analysis of field differences and relationships
 */
export const useFieldAnalysis = (
  containerFields: FieldDefinition[],
  allCoreFields: Array<FieldBuilder>
): FieldAnalysisResult => {
  return useMemo(() => {
    // Finds the actual database version of the fields that are in the container
    const coreFieldsForOurFields = allCoreFields.filter((field) => 
      containerFields.some((f) => f.id === field.id)
    );
    
    // Finds the fields that are not in the database
    const fieldsNotInCoreFields = containerFields.filter((field) => 
      !coreFieldsForOurFields.some((f) => f.id === field.id)
    );
    
    // Core fields that are marked as dirty
    const dirtyCoreFieldsForOurFields = coreFieldsForOurFields.filter((field) => 
      "isDirty" in field && field.isDirty
    );
    
    // Container fields that differ from their core versions
    const fieldsDifferentFromCoreField = containerFields.filter(containerField => {
      const matchingCoreField = coreFieldsForOurFields.find(coreField => 
        coreField.id === containerField.id
      );
      if (!matchingCoreField) return false;
      
      return hasFieldDifferences(containerField, matchingCoreField);
    });
    
    // Detailed differences for each field
    const fieldDifferencesDetails = fieldsDifferentFromCoreField.map(containerField => {
      const matchingCoreField = coreFieldsForOurFields.find(coreField => 
        coreField.id === containerField.id
      );
      if (!matchingCoreField) return null;
      
      return getFieldDifferences(containerField, matchingCoreField);
    }).filter(Boolean);
    
    return {
      coreFieldsForOurFields,
      fieldsNotInCoreFields,
      dirtyCoreFieldsForOurFields,
      fieldsDifferentFromCoreField,
      fieldDifferencesDetails
    };
  }, [containerFields, allCoreFields]);
}; 