import React, { useState } from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/options/layout.types";
import StepperSearchGroup from "@/features/applet/layouts/core/StepperSearchGroup";
import UniformHeightWrapper from "@/features/applet/layouts/core/UniformHeightWrapper";
import { allSystemWideMockApplets } from "@/features/applet/sample-mock-data/constants";

const StepperSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = allSystemWideMockApplets[activeTab] || [];
  const [currentStep, setCurrentStep] = useState(0);
  
  const handleNext = () => {
    if (currentStep < activeSearchGroups.length - 1) {
      setCurrentStep(currentStep + 1);
      setActiveFieldId(activeSearchGroups[currentStep + 1].id);
    }
  };
  
  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setActiveFieldId(activeSearchGroups[currentStep - 1].id);
    }
  };

  const handleStepClick = (index: number) => {
    setCurrentStep(index);
    setActiveFieldId(activeSearchGroups[index].id);
  };
  
  const isLastStep = currentStep === activeSearchGroups.length - 1;
  
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
      {/* Stepper navigation */}
      <div className="flex mb-4">
        {activeSearchGroups.map((group, index) => (
          <div 
            key={group.id}
            className={`flex-1 text-center ${
              index < currentStep 
                ? "text-rose-600" 
                : index === currentStep 
                  ? "text-rose-500 font-bold" 
                  : "text-gray-400"
            }`}
          >
            <button
              onClick={() => handleStepClick(index)}
              className={`rounded-full w-8 h-8 mx-auto mb-2 flex items-center justify-center ${
                index <= currentStep 
                  ? "bg-rose-500 text-white hover:bg-rose-600" 
                  : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              {index + 1}
            </button>
            <button 
              onClick={() => handleStepClick(index)}
              className="text-sm hover:underline focus:outline-none"
            >
              {group.label}
            </button>
          </div>
        ))}
      </div>
      
      <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700">
        {/* Header section with lighter background */}
        <div className="bg-gray-100 dark:bg-gray-700 p-4 border-b dark:border-gray-600">
          <div className="text-rose-500 font-medium text-lg">
            {activeSearchGroups[currentStep]?.label}
          </div>
          <div className="text-gray-600 dark:text-gray-300 text-sm">
            Select the number of beds and room type
          </div>
        </div>
        
        {/* Content section */}
        <div className="p-4">
          <div className="w-full">
            {activeSearchGroups.map((group, index) => (
              <UniformHeightWrapper
                key={group.id}
                groupId={group.id}
                layoutType="stepper"
                className={`transition-opacity duration-300 ${
                  index === currentStep 
                    ? 'opacity-100 visible' 
                    : 'opacity-0 invisible absolute top-0 left-0 w-full'
                }`}
              >
                <StepperSearchGroup
                  id={group.id}
                  label={group.label}
                  placeholder={group.placeholder}
                  description={group.description}
                  fields={group.fields}
                  isActive={true}
                  onClick={() => {}}
                  onOpenChange={() => {}}
                  isMobile={false}
                  className="border-0"
                />
              </UniformHeightWrapper>
            ))}
          </div>
        </div>
      </div>
      
      {/* Navigation buttons OUTSIDE the container */}
      <div className="flex justify-between mt-6">
        <button 
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded ${
            currentStep === 0 
            ? "bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          Previous
        </button>
        
        {isLastStep ? (
          actionButton || (
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded">
              Search
            </button>
          )
        ) : (
          <button 
            onClick={handleNext}
            className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default StepperSearchLayout;