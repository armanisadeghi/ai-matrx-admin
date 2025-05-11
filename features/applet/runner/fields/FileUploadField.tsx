import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { selectBrokerValue, updateBrokerValue } from "@/lib/redux/app-runner/slices/brokerSlice";
import { ensureValidWidthClass } from "@/features/applet/constants/field-constants";
import { cn } from "@/lib/utils";
import { FileUploadWithStorage } from "@/components/ui/file-upload/FileUploadWithStorage";
import { EnhancedFileDetails } from "@/utils/file-operations/constants";

interface ComponentProps {
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  minDate?: string;
  maxDate?: string;
  onLabel?: string;
  offLabel?: string;
  multiSelect?: boolean;
  maxItems?: number;
  minItems?: number;
  gridCols?: string;
  autoComplete?: string;
  direction?: "vertical" | "horizontal";
  customContent?: React.ReactNode;
  showSelectAll?: boolean;
  width?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  maxLength?: number;
  spellCheck?: boolean;
}

interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  helpText?: string;
  group?: string;
  iconName?: string;
  component: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: any[];
  componentProps: ComponentProps;
  includeOther?: boolean;
}

const FileUploadField: React.FC<{
  field: FieldDefinition;
  appletId: string;
  isMobile?: boolean;
}> = ({ field, appletId, isMobile }) => {
  const { 
    id, 
    label, 
    componentProps = {},
    disabled = false,
    required = false
  } = field;
  
  const { 
    width, 
    customContent,
    multiSelect = false, // Use multiSelect as the flag for multiple file uploads
    maxItems = undefined // Optional limit on the number of files
  } = componentProps;
  
  const safeWidthClass = ensureValidWidthClass(width);
  
  const dispatch = useAppDispatch();
  const stateValue = useAppSelector((state) => selectBrokerValue(state, "applet", id));
  
  // Track the upload status
  const [isUploading, setIsUploading] = React.useState(false);
  
  // Initialize from defaultValue if available and no current state
  useEffect(() => {
    if (stateValue === undefined && field.defaultValue) {
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: field.defaultValue,
        })
      );
    }
  }, [dispatch, field.defaultValue, id, stateValue]);
  
  // Handle upload completion
  const handleUploadComplete = (results: { url: string; type: string; details?: EnhancedFileDetails }[]) => {
    if (results && results.length > 0) {
      // For single file upload, just store the first result
      if (!multiSelect) {
        dispatch(
          updateBrokerValue({
            source: "applet",
            itemId: id,
            value: results[0],
          })
        );
        return;
      }
      
      // For multiple files, handle differently depending on what's already in state
      let updatedValue;
      
      if (!stateValue) {
        // No existing value, just use the results array
        updatedValue = results;
      } else if (Array.isArray(stateValue)) {
        // Existing array, append the new results (respecting maxItems if set)
        const combinedResults = [...stateValue, ...results];
        updatedValue = maxItems ? combinedResults.slice(0, maxItems) : combinedResults;
      } else {
        // Existing single value, convert to array with new results
        updatedValue = [stateValue, ...results];
        if (maxItems) {
          updatedValue = updatedValue.slice(0, maxItems);
        }
      }
      
      dispatch(
        updateBrokerValue({
          source: "applet",
          itemId: id,
          value: updatedValue,
        })
      );
    }
  };
  
  // Handle upload status changes
  const handleUploadStatusChange = (uploading: boolean) => {
    setIsUploading(uploading);
  };
  
  // Render custom content if provided
  if (customContent) {
    return <>{customContent}</>;
  }
  
  // Determine if we have reached the maximum items (only applies for multiple)
  const hasReachedMaxItems = multiSelect && maxItems !== undefined && 
    Array.isArray(stateValue) && stateValue.length >= maxItems;
  
  // Check if there's a validation error (required but no files)
  const hasValidationError = required && 
    (!stateValue || (Array.isArray(stateValue) && stateValue.length === 0));
  
  // Prepare initialFiles based on the current state
  const initialFiles = stateValue 
    ? (Array.isArray(stateValue) ? stateValue : [stateValue]) 
    : [];
  
  return (
    <div className={`${safeWidthClass}`}>
      <div 
        className={cn(
          "w-full",
          hasValidationError && "border-red-500",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        {/* Show the existing files count if any */}
        {stateValue && (
          <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            {Array.isArray(stateValue) ? (
              `${stateValue.length} file${stateValue.length !== 1 ? 's' : ''} uploaded`
            ) : (
              "1 file uploaded"
            )}
            {maxItems && (
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                (Max: {maxItems})
              </span>
            )}
          </div>
        )}
        
        {/* Only show the uploader if we haven't reached max items or if single upload */}
        {(!hasReachedMaxItems || !multiSelect) && (
          <FileUploadWithStorage 
            saveTo="public"
            multiple={multiSelect}
            useMiniUploader={true}
            onUploadComplete={handleUploadComplete}
            onUploadStatusChange={handleUploadStatusChange}
            initialFiles={initialFiles}
          />
        )}
        
        {/* Show message if max items reached */}
        {hasReachedMaxItems && (
          <div className="text-amber-600 dark:text-amber-400 text-sm mt-1">
            Maximum number of files reached ({maxItems}). Remove files to upload more.
          </div>
        )}
      </div>
      
      {/* Validation error message */}
      {hasValidationError && !isUploading && (
        <div className="text-red-500 text-sm mt-1">
          {required && "Please upload at least one file."}
        </div>
      )}
      
      {/* Helper text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {multiSelect 
          ? "You can upload multiple files at once by selecting them together."
          : "Only one file can be uploaded."}
      </div>
    </div>
  );
};

export default FileUploadField;