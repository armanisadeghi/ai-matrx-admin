'use client';
import React, { useState, useEffect } from 'react';
// Import specialized components
import WebSearch from './WebSearch';
import AudioProcessing from './AudioProcessing';
import DocumentReading from './DocumentReading';
import BrainActivity from './BrainActivity';
import PlanCreation from './PlanCreation';
import QuestionGenerating from './QuestionGenerating';
import ExpertConnecting from './ExpertConnecting';
import FinalProcessing from './FinalProcessing';
import QuickResponse from './QuickResponse';
import FileProcessing from './FileProcessing';
import LongProcess from './LongProcess';
import RecipeProcessing from './RecipeProcessing';


export interface InputControlsSettings {
  searchEnabled: boolean;
  toolsEnabled: boolean;
  thinkEnabled: boolean;
  researchEnabled: boolean;
  recipesEnabled: boolean;
  planEnabled: boolean;
  audioEnabled: boolean;
  enableAskQuestions: boolean;
  enableBrokers: boolean;

}
// Extend animation types with the new animations
type AnimationType = 
  | 'thinking' 
  | 'circular' 
  | 'bouncing' 
  | 'flipping' 
  | 'growing' 
  | 'blinking' 
  | 'waving' 
  | 'rotating' 
  | 'swinging' 
  | 'spinner'
  | 'webSearch'
  | 'audioProcessing'
  | 'documentReading'
  | 'brainActivity'
  | 'planCreation'
  | 'questionGenerating'
  | 'expertConnecting'
  | 'finalProcessing'
  | 'recipeSearch';
// Feature configuration with customizable timing and multi-step support
export const FEATURE_CONFIG = {
  thinkEnabled: {
    message: 'Thinking...',
    type: 'brainActivity' as AnimationType,
    displayTime: 1000, // Fast - 1 second
    steps: [
      { message: 'Thinking...', type: 'brainActivity' as AnimationType }
    ]
  },
  searchEnabled: {
    message: 'Searching the web...',
    type: 'webSearch' as AnimationType,
    displayTime: 4000,
    steps: [
      { message: 'Searching the web...', type: 'webSearch' as AnimationType, displayTime: 3000 },
      { message: 'Analyzing web results...', type: 'documentReading' as AnimationType, displayTime: 3000 }
    ]
  },
  toolsEnabled: {
    message: 'Using tools...',
    type: 'circular' as AnimationType,
    displayTime: 3000,
    steps: [
      { message: 'Using tools...', type: 'circular' as AnimationType }
    ]
  },
  researchEnabled: {
    message: 'Researching...',
    type: 'documentReading' as AnimationType,
    displayTime: 2000, // Medium - 2 seconds
    steps: [
      { message: 'Researching...', type: 'documentReading' as AnimationType }
    ]
  },
  recipesEnabled: {
    message: 'Finding recipes...',
    type: 'recipeSearch' as AnimationType,
    displayTime: 2000, // Medium - 2 seconds
    steps: [
      { message: 'Finding recipes...', type: 'recipeSearch' as AnimationType }
    ]
  },
  planEnabled: {
    message: 'Creating plan...',
    type: 'planCreation' as AnimationType,
    displayTime: 2500, // Medium - 2.5 seconds
    steps: [
      { message: 'Creating plan...', type: 'planCreation' as AnimationType }
    ]
  },
  audioEnabled: {
    message: 'Processing audio...',
    type: 'audioProcessing' as AnimationType,
    displayTime: 4000, // Slow - 4 seconds
    steps: [
      { message: 'Transcribing audio...', type: 'audioProcessing' as AnimationType, displayTime: 4000 },
      { message: 'Analyzing audio content...', type: 'brainActivity' as AnimationType, displayTime: 3000 }
    ]
  },
  enableAskQuestions: {
    message: 'Formulating questions...',
    type: 'questionGenerating' as AnimationType,
    displayTime: 2000, // Medium - 2 seconds
    steps: [
      { message: 'Formulating questions...', type: 'questionGenerating' as AnimationType }
    ]
  },
  enableBrokers: {
    message: 'Getting your custom data...',
    type: 'expertConnecting' as AnimationType,
    displayTime: 1000,
    steps: [
      { message: 'Getting your custom data...', type: 'expertConnecting' as AnimationType }
    ]
  }
};
// Final fallback step when all steps have completed
const FINAL_STEP = {
  message: 'Internal Thinking...',
  type: 'finalProcessing' as AnimationType,
  displayTime: 2000
};
interface LoadingIndicatorProps {
  settings?: InputControlsSettings | null;
  className?: string;
  defaultDisplayTime?: number; // Fallback time for features without specific timing
  maxCycleCount?: number; // Maximum number of cycles before showing final step
}
interface Step {
  message: string;
  type: AnimationType;
  displayTime?: number;
}
interface FeatureStep {
  featureKey: keyof InputControlsSettings;
  step: Step;
  stepIndex: number;
  totalSteps: number;
}
// Define default settings with all features disabled
const DEFAULT_SETTINGS: InputControlsSettings = {
  searchEnabled: false,
  toolsEnabled: false,
  thinkEnabled: false,
  researchEnabled: false,
  recipesEnabled: false,
  planEnabled: false,
  audioEnabled: false,
  enableAskQuestions: false,
  enableBrokers: false
};
const ControlledLoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  settings,
  className = "",
  defaultDisplayTime = 3000,
  maxCycleCount = 2
}) => {
  // Normalize settings to ensure we always have valid values
  const normalizeSettings = (): InputControlsSettings => {
    // If settings is null or undefined, use default settings
    if (!settings) return { ...DEFAULT_SETTINGS };
    
    // Create a new settings object with defaults for any missing properties
    const normalizedSettings: InputControlsSettings = { ...DEFAULT_SETTINGS };
    
    // Only override defaults with truthy values from the provided settings
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      const typedKey = key as keyof InputControlsSettings;
      if (settings[typedKey] === true) {
        normalizedSettings[typedKey] = true;
      }
    });
    
    return normalizedSettings;
  };
  
  // State to track current feature and step
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [allSteps, setAllSteps] = useState<FeatureStep[]>([]);
  const [cycleCount, setCycleCount] = useState(0);
  const [showFinalStep, setShowFinalStep] = useState(false);
  
  // Build a flattened array of all steps for all enabled features
  useEffect(() => {
    const normalizedSettings = normalizeSettings();
    const steps: FeatureStep[] = [];
    
    Object.entries(normalizedSettings).forEach(([key, isEnabled]) => {
      if (isEnabled && key in FEATURE_CONFIG) {
        const typedKey = key as keyof typeof FEATURE_CONFIG;
        const featureSteps = FEATURE_CONFIG[typedKey].steps;
        
        featureSteps.forEach((step, stepIndex) => {
          steps.push({
            featureKey: typedKey as keyof InputControlsSettings,
            step,
            stepIndex,
            totalSteps: featureSteps.length
          });
        });
      }
    });
    
    setAllSteps(steps);
    setCurrentStepIndex(0);
    setCycleCount(0);
    setShowFinalStep(false);
  }, [settings]);
  
  // Cycle through all steps with their individual timing
  useEffect(() => {
    if (allSteps.length === 0) {
      // If no steps, show final step directly
      setShowFinalStep(true);
      return;
    }
    
    if (showFinalStep) {
      return; // Stop cycling if we're showing the final step
    }
    
    const currentStep = allSteps[currentStepIndex];
    const displayTime = currentStep.step.displayTime || 
                        FEATURE_CONFIG[currentStep.featureKey].displayTime ||
                        defaultDisplayTime;
    
    const timer = setTimeout(() => {
      const nextIndex = (currentStepIndex + 1) % allSteps.length;
      
      // If we're about to loop back to the start, increment cycle count
      if (nextIndex === 0) {
        const newCycleCount = cycleCount + 1;
        setCycleCount(newCycleCount);
        
        // If we've completed the max cycles, show final step
        if (newCycleCount >= maxCycleCount) {
          setShowFinalStep(true);
          return;
        }
      }
      
      setCurrentStepIndex(nextIndex);
    }, displayTime);
    
    return () => clearTimeout(timer);
  }, [currentStepIndex, allSteps, cycleCount, showFinalStep, defaultDisplayTime, maxCycleCount]);
  
  // Get current step information
  const getCurrentStep = () => {
    if (showFinalStep) {
      return {
        step: FINAL_STEP,
        totalSteps: 1,
        stepIndex: 0
      };
    }
    
    if (allSteps.length === 0) {
      return {
        step: FINAL_STEP,
        totalSteps: 1,
        stepIndex: 0
      };
    }
    
    return {
      step: allSteps[currentStepIndex].step,
      totalSteps: allSteps[currentStepIndex].totalSteps,
      stepIndex: allSteps[currentStepIndex].stepIndex
    };
  };
  
  const { step, totalSteps, stepIndex } = getCurrentStep();
  
  // Format step indicator text
  const getStepIndicator = () => {
    if (totalSteps <= 1) return '';
    return ` (${stepIndex + 1}/${totalSteps})`;
  };
  
  // Render the component based on the animation type
  const renderComponent = () => {
    const message = `${step.message}${getStepIndicator()}`;
    
    switch (step.type) {
      case 'webSearch':
        return <WebSearch message={message} className={className} />;
        
      case 'audioProcessing':
        return <AudioProcessing message={message} className={className} />;
        
      case 'documentReading':
        return <DocumentReading message={message} className={className} />;
        
      case 'brainActivity':
        return <BrainActivity message={message} className={className} />;
        
      case 'planCreation':
        return <PlanCreation message={message} className={className} />;
        
      case 'questionGenerating':
        return <QuestionGenerating message={message} className={className} />;
        
      case 'expertConnecting':
        return <ExpertConnecting message={message} className={className} />;
        
      case 'finalProcessing':
        return <FinalProcessing message={message} className={className} />;
      
      case 'recipeSearch':
        return <RecipeProcessing message={message} className={className} />;
        
      case 'thinking':
        return <QuickResponse message={message} className={className} />;
        
      case 'circular':
        return <FileProcessing message={message} className={className} />;
        
      case 'bouncing':
      case 'flipping':
      case 'growing':
      case 'blinking':
      case 'waving':
      case 'rotating':
      case 'swinging':
      case 'spinner':
        return <LongProcess messages={[message]} className={className} />;
        
      default:
        return <QuickResponse message={message} className={className} />;
    }
  };
  
  // Progress indicator to show when cycling through normal steps
  const renderProgressIndicator = () => {
    if (showFinalStep || allSteps.length <= 1) return null;
    
    return (
      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
        {`${currentStepIndex + 1}/${allSteps.length}`}
      </span>
    );
  };
  
  return (
    <div className="flex items-center">
      {renderComponent()}
      {renderProgressIndicator()}
    </div>
  );
};
export default ControlledLoadingIndicator;