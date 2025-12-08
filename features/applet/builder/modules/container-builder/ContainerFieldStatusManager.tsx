"use client";

import React, { useEffect } from "react";
import { AlertTriangle, Save, RefreshCcw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppSelector } from "@/lib/redux";
import { selectAllFields } from "@/lib/redux/app-builder/selectors/fieldSelectors";
import { useFieldAnalysis } from "@/features/applet/hooks/useFieldAnalysis";
import { FieldDefinition } from "@/types/customAppTypes";

interface ContainerFieldStatusManagerProps {
  container: { id: string; label?: string } | null;
  field: FieldDefinition;
  onRecompileField?: (fieldId: string) => void;
  onSaveFieldChanges?: (fieldId: string) => void;
  onMissingField?: (fieldId: string) => void;
}

// TODO: This logic is not correct.


const ContainerFieldStatusManager: React.FC<ContainerFieldStatusManagerProps> = ({
  container,
  field,
  onRecompileField,
  onSaveFieldChanges,
  onMissingField,
}) => {
  const allCoreFields = useAppSelector((state) => selectAllFields(state));
  const fieldAnalysis = useFieldAnalysis([field], allCoreFields);

  const handleRecompileField = (fieldId: string) => {
    if (onRecompileField) {
      onRecompileField(fieldId);
    } else {
      console.log(`Recompile field clicked for ${fieldId}`);
    }
  };

  const handleSaveFieldChanges = (fieldId: string) => {
    if (onSaveFieldChanges) {
      onSaveFieldChanges(fieldId);
    } else {
      console.log(`Save field changes clicked for ${fieldId}`);
    }
  };

  const handleMissingField = (fieldId: string) => {
    if (onMissingField) {
      onMissingField(fieldId);
    } else {
      console.log(`Missing field status clicked for ${fieldId}`);
    }
  };

  // Determine field status
  const isMissing = fieldAnalysis.fieldsNotInCoreFields.some((f) => f.id === field.id);
  const hasDirtyCore = fieldAnalysis.dirtyCoreFieldsForOurFields.some((f) => f.id === field.id);
  const hasDifferences = fieldAnalysis.fieldsDifferentFromCoreField.some((f) => f.id === field.id);
  const isOk = !isMissing && !hasDirtyCore && !hasDifferences;

  return (
    <>
      {!isOk && (
        <div className="mt-2 pt-2 border-t border-border flex items-center text-xs text-gray-600 dark:text-gray-400">
          <span className="mr-2">Status:</span>
          <TooltipProvider>
            {isMissing && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMissingField(field.id)}
                    className="h-6 w-6 text-amber-500 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/20"
                  >
                    <AlertTriangle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Field missing from database
                </TooltipContent>
              </Tooltip>
            )}
            {hasDirtyCore && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleSaveFieldChanges(field.id)}
                    className="h-6 w-6 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Core field has unsaved changes
                </TooltipContent>
              </Tooltip>
            )}
            {!isMissing && !hasDirtyCore && hasDifferences && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRecompileField(field.id)}
                    className="h-6 w-6 text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/20"
                  >
                    <RefreshCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Field needs recompiling
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}
      {isOk && (
        <div className="mt-2 pt-2 border-t border-border flex items-center text-xs text-gray-600 dark:text-gray-400">
          <span className="mr-2">Status:</span>
          <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
        </div>
      )}
    </>
  );
};

export default ContainerFieldStatusManager;