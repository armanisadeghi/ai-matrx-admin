// File: components/search/layouts/StepperSearchLayout.tsx
import React, { useState } from "react";
import { SearchLayoutProps } from "../types";
import StepperSearchGroup from "../StepperSearchGroup";

const StepperSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  activeFieldId,
  setActiveFieldId,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
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
  
  const isLastStep = currentStep === activeSearchGroups.length - 1;
  
  return (
    <div className={`w-full max-w-4xl mx-auto p-4 ${className}`}>
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
            <div 
              className={`rounded-full w-8 h-8 mx-auto mb-2 flex items-center justify-center ${
                index <= currentStep 
                  ? "bg-rose-500 text-white" 
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              {index + 1}
            </div>
            <div className="text-sm">{group.label}</div>
          </div>
        ))}
      </div>
      
      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 dark:border-gray-700">
        {activeSearchGroups.map((group, index) => (
          <div key={group.id} style={{ display: index === currentStep ? 'block' : 'none' }}>
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
            />
          </div>
        ))}
        
        <div className="flex justify-between mt-6">
          <button 
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded ${
              currentStep === 0 
                ? "bg-gray-200 text-gray-500" 
                : "bg-gray-300 hover:bg-gray-400 text-gray-800"
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
    </div>
  );
};

export default StepperSearchLayout;
