import React, { useState, useMemo } from "react";
import { AppletInputProps } from "@/features/applet/runner/layouts/AppletLayoutManager";
import StepperSearchGroup from "@/features/applet/runner/layouts/core/StepperSearchGroup";
import UniformHeightWrapper from "@/features/applet/runner/layouts/core/UniformHeightWrapper";
import SearchGroupHeader from "@/features/applet/runner/layouts/core/SearchContainerHeader";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAppletRuntimeContainers } from "@/lib/redux/app-runner/slices/customAppletRuntimeSlice";

const StepperAppletFieldInputLayout: React.FC<AppletInputProps> = ({
  appletId,
  activeContainerId,
  setActiveContainerId,
  actionButton,
  className = "",
  isMobile = false,
  source = "applet",
}) => {
  const appletContainers = useAppSelector(state => selectAppletRuntimeContainers(state, appletId));
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  
  // Flatten all fields from all containers while preserving container info
  const allFields = useMemo(() => {
    const fields: Array<{ field: any; containerId: string; containerLabel: string; containerDescription?: string }> = [];
    appletContainers.forEach(container => {
      container.fields.forEach(field => {
        fields.push({
          field,
          containerId: container.id,
          containerLabel: container.label,
          containerDescription: container.description,
        });
      });
    });
    return fields;
  }, [appletContainers]);
  
  const currentFieldData = allFields[currentFieldIndex];
  
  const handleNext = () => {
    if (currentFieldIndex < allFields.length - 1) {
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      setActiveContainerId(allFields[nextIndex].containerId);
    }
  };
  
  const handlePrev = () => {
    if (currentFieldIndex > 0) {
      const prevIndex = currentFieldIndex - 1;
      setCurrentFieldIndex(prevIndex);
      setActiveContainerId(allFields[prevIndex].containerId);
    }
  };
  
  const isLastField = currentFieldIndex === allFields.length - 1;
  
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      
      <div className="border rounded-lg overflow-hidden bg-textured dark:border-gray-700">
        {/* Header section showing current field info */}
        <SearchGroupHeader 
          label={currentFieldData?.field.label} 
          description={currentFieldData?.field.description}
        />
        
        {/* Field content */}
        <div className="p-4">
          <div className="w-full relative min-h-[200px]">
            {allFields.map((fieldData, index) => (
              <UniformHeightWrapper
                key={`${fieldData.containerId}-${fieldData.field.id}`}
                containerId={fieldData.containerId}
                layoutType="stepper"
                className={`transition-opacity duration-300 ${
                  index === currentFieldIndex 
                    ? 'opacity-100 visible' 
                    : 'opacity-0 invisible absolute top-0 left-0 w-full'
                }`}
              >
                {/* Render only the single field */}
                <StepperSearchGroup
                  id={fieldData.containerId}
                  label={fieldData.containerLabel}
                  description={fieldData.containerDescription}
                  fields={[fieldData.field]} // Only pass the current field
                  appletId={appletId}
                  isActive={true}
                  onClick={() => {}}
                  onOpenChange={() => {}}
                  isMobile={isMobile}
                  className="border-0"
                  source={source}
                  hideFieldLabels={true}
                />
              </UniformHeightWrapper>
            ))}
          </div>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between mt-6">
        <button 
          onClick={handlePrev}
          disabled={currentFieldIndex === 0}
          className={`px-4 py-2 rounded-md ${
            currentFieldIndex === 0 
            ? "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Previous
        </button>
        
        {isLastField ? (
          actionButton || (
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded">
              Search
            </button>
          )
        ) : (
          <button 
            onClick={handleNext}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-md"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default StepperAppletFieldInputLayout;