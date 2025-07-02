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

interface AppletFieldAnalysisResult {
  hasAnyIssues: boolean;
  totalFieldsWithDifferences: number;
  totalDirtyFields: number;
  totalMissingFields: number;
  totalFieldsWithIssues: number;
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

/**
 * Hook to analyze field issues across all containers in an applet
 * 
 * @param containers Array of containers in the applet
 * @param allCoreFields All core database fields
 * @returns Aggregated analysis of field issues across the entire applet
 */
export const useAppletFieldAnalysis = (
  containers: Array<{ fields?: FieldDefinition[] }>,
  allCoreFields: Array<FieldBuilder>
): AppletFieldAnalysisResult => {
  return useMemo(() => {
    let totalFieldsWithDifferences = 0;
    let totalDirtyFields = 0;
    let totalMissingFields = 0;
    
    // Aggregate analysis across all containers
    containers.forEach(container => {
      if (container.fields && container.fields.length > 0) {
        const containerFields = container.fields;
        
        // Replicate the field analysis logic inline
        const coreFieldsForOurFields = allCoreFields.filter((field) => 
          containerFields.some((f) => f.id === field.id)
        );
        
        const fieldsNotInCoreFields = containerFields.filter((field) => 
          !coreFieldsForOurFields.some((f) => f.id === field.id)
        );
        
        const dirtyCoreFieldsForOurFields = coreFieldsForOurFields.filter((field) => 
          "isDirty" in field && field.isDirty
        );
        
        const fieldsDifferentFromCoreField = containerFields.filter(containerField => {
          const matchingCoreField = coreFieldsForOurFields.find(coreField => 
            coreField.id === containerField.id
          );
          if (!matchingCoreField) return false;
          
          return hasFieldDifferences(containerField, matchingCoreField);
        });
        
        // Add to totals
        totalFieldsWithDifferences += fieldsDifferentFromCoreField.length;
        totalDirtyFields += dirtyCoreFieldsForOurFields.length;
        totalMissingFields += fieldsNotInCoreFields.length;
      }
    });
    
    const totalFieldsWithIssues = totalFieldsWithDifferences + totalDirtyFields + totalMissingFields;
    const hasAnyIssues = totalFieldsWithIssues > 0;
    
    return {
      hasAnyIssues,
      totalFieldsWithDifferences,
      totalDirtyFields,
      totalMissingFields,
      totalFieldsWithIssues
    };
  }, [containers, allCoreFields]);
}; 