import React from 'react';
import { 
  LayoutDashboard,
  Palette,
  Cpu,
  Link as LinkIcon,
  Rocket
} from 'lucide-react';

const ProgressSteps = ({ currentStep }) => {
  // Steps configuration
  const steps = [
    { id: 1, name: 'Setup', icon: LayoutDashboard },
    { id: 2, name: 'Design', icon: Palette },
    { id: 3, name: 'Features', icon: Cpu },
    { id: 4, name: 'Integrations', icon: LinkIcon },
    { id: 5, name: 'Publish', icon: Rocket }
  ];

  return (
    <div className="hidden md:flex items-center justify-center space-x-1 relative">
      {/* Progress bar connecting steps */}
      <div className="absolute h-1 bg-gray-200 top-1/2 left-6 right-6 -translate-y-1/2 z-0">
        <div 
          className="h-full bg-indigo-500 transition-all duration-300" 
          style={{ width: `${(currentStep - 1) / (steps.length - 1) * 100}%` }}
        ></div>
      </div>
      
      {/* Step circles and labels */}
      {steps.map((step) => (
        <div key={step.id} className="flex flex-col items-center z-10 px-6">
          <div className="flex items-center justify-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                step.id < currentStep 
                  ? 'bg-indigo-500 text-white' 
                  : step.id === currentStep 
                    ? 'bg-indigo-500 text-white ring-4 ring-indigo-200' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              <step.icon className="w-5 h-5" />
            </div>
          </div>
          <span 
            className={`mt-2 text-xs font-medium ${
              step.id <= currentStep ? 'text-indigo-500' : 'text-gray-500'
            }`}
          >
            {step.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProgressSteps;