import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: {
    id: string;
    title: string;
    description: string;
  }[];
  activeStep: number;
  showDescription: boolean;
  onStepClick: (index: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ steps, activeStep, onStepClick, showDescription }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-900 overflow-x-auto">
      <nav aria-label="Progress" className="pb-2">
        {/* Desktop view */}
        <ol role="list" className="hidden md:flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`relative ${
                index !== steps.length - 1 ? 'pr-8 flex-grow' : ''
              }`}
            >
              <div className="flex items-center">
                <button
                  onClick={() => onStepClick(index)}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                    index < activeStep
                      ? 'bg-rose-500 dark:bg-rose-600 hover:bg-rose-600 dark:hover:bg-rose-700'
                      : index === activeStep
                      ? 'bg-rose-500 dark:bg-rose-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  disabled={index > activeStep + 1}
                >
                  {index < activeStep ? (
                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : index === activeStep ? (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-white"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-rose-500"
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only">{step.title}</span>
                </button>

                {index !== steps.length - 1 && (
                  <div
                    className={`absolute top-4 left-0 h-0.5 w-full ${
                      index < activeStep ? 'bg-rose-500 dark:bg-rose-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 flex flex-col items-start text-sm font-medium">
                <span
                  className={`${
                    index <= activeStep ? 'text-rose-500 dark:text-rose-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
                {showDescription && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* Mobile view */}
        <ol role="list" className="md:hidden flex items-center overflow-x-auto py-4 px-2 space-x-8">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className="flex flex-col items-center w-16"
            >
              <div className="flex items-center">
                <button
                  onClick={() => onStepClick(index)}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                    index < activeStep
                      ? 'bg-rose-500 dark:bg-rose-600 hover:bg-rose-600 dark:hover:bg-rose-700'
                      : index === activeStep
                      ? 'bg-rose-500 dark:bg-rose-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  disabled={index > activeStep + 1}
                >
                  {index < activeStep ? (
                    <Check className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : index === activeStep ? (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-white"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-rose-500"
                      aria-hidden="true"
                    />
                  )}
                  <span className="sr-only">{step.title}</span>
                </button>
              </div>
              <div className="mt-2 flex flex-col items-center text-sm font-medium">
                <span
                  className={`text-center h-10 flex items-center ${
                    index <= activeStep ? 'text-rose-500 dark:text-rose-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.title.split(' ').map((word, i) => (
                    <React.Fragment key={i}>
                      {word}
                      {i < step.title.split(' ').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </span>
              </div>
              
              {/* Mobile connecting line between steps */}
              {index !== steps.length - 1 && (
                <div className="absolute right-0 w-8 h-0.5 bg-gray-200 dark:bg-gray-700 translate-x-4 translate-y-4" />
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default Stepper;