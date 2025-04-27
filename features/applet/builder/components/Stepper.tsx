import React from 'react';
import { CheckIcon } from 'lucide-react';

interface StepperProps {
  steps: {
    id: string;
    title: string;
    description: string;
  }[];
  activeStep: number;
  onStepClick: (index: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ steps, activeStep, onStepClick }) => {
  return (
    <div className="px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={`relative ${
                index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-grow' : ''
              }`}
            >
              <div className="flex items-center">
                <button
                  onClick={() => onStepClick(index)}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full ${
                    index < activeStep
                      ? 'bg-rose-500 dark:bg-rose-600 group-hover:bg-rose-600 dark:group-hover:bg-rose-700'
                      : index === activeStep
                      ? 'bg-rose-500 dark:bg-rose-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                  disabled={index > activeStep + 1}
                >
                  {index < activeStep ? (
                    <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                  ) : (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        index === activeStep ? 'bg-white' : 'bg-transparent'
                      }`}
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
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {step.description}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}; 