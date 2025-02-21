'use client';

import React, { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, Save, Settings } from 'lucide-react';
import FeaturesStep from './FeaturesStep';
import AppPreview from './AppPreview';
import ProgressSteps from './ProgressSteps';

// Main App Builder Component
const AppletBuilder = () => {
  // State for tracking the current step
  const [currentStep, setCurrentStep] = useState(3);
  
  // State for selected features
  const [selectedFeatures, setSelectedFeatures] = useState({
    nlp: true,
    imageRecognition: false,
    sentimentAnalysis: false,
    dataPrediction: false,
    automatedResponses: false
  });

  // State for showing help dialog
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  
  // State for unsaved changes dialog
  const [unsavedChangesDialog, setUnsavedChangesDialog] = useState(false);

  // Handle feature selection
  const handleFeatureToggle = (feature) => {
    setSelectedFeatures({
      ...selectedFeatures,
      [feature]: !selectedFeatures[feature]
    });
  };

  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Save progress
  const saveProgress = () => {
    // Simulate saving with a success message
    alert("Progress saved successfully!");
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-500 flex items-center justify-center transform rotate-45">
                <div className="w-4 h-4 bg-white transform -rotate-45"></div>
              </div>
              <span className="text-lg font-bold">AI Applet Builder</span>
            </div>
            
            {/* Progress Steps Component */}
            <ProgressSteps currentStep={currentStep} />
            
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setHelpDialogOpen(true)}
              >
                <HelpCircle className="w-5 h-5 text-gray-500" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={saveProgress}
              >
                <Save className="w-5 h-5 text-gray-500" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
              >
                <Settings className="w-5 h-5 text-gray-500" />
              </Button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Builder Controls */}
            <div>
              {/* Render the appropriate step component based on currentStep */}
              {currentStep === 3 && (
                <FeaturesStep 
                  selectedFeatures={selectedFeatures}
                  onFeatureToggle={handleFeatureToggle}
                  onPrevious={goToPreviousStep}
                  onNext={goToNextStep}
                />
              )}
              {/* Other step components would be conditionally rendered here */}
            </div>
            
            {/* Right Column - Preview */}
            <div>
              <AppPreview selectedFeatures={selectedFeatures} />
            </div>
          </div>
        </main>
        
        {/* Help Dialog */}
        <Dialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI Features Help</DialogTitle>
              <DialogDescription>
                Learn more about the available AI features for your applet.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-medium">Natural Language Processing (NLP)</h3>
                <p className="text-sm text-gray-500">
                  Enables your applet to understand and process human language. 
                  This powers features like text analysis, translation, and understanding user queries.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Image Recognition</h3>
                <p className="text-sm text-gray-500">
                  Allows your applet to identify objects, scenes, and patterns within images.
                  Useful for categorizing photos, visual search, and automated tagging.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Sentiment Analysis</h3>
                <p className="text-sm text-gray-500">
                  Determines the emotional tone behind text to understand opinions and attitudes.
                  Great for analyzing customer feedback and social media monitoring.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Data Prediction</h3>
                <p className="text-sm text-gray-500">
                  Uses historical data to forecast future trends and outcomes.
                  Perfect for sales forecasting, inventory management, and business planning.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium">Automated Responses</h3>
                <p className="text-sm text-gray-500">
                  Creates appropriate replies to common queries or situations based on predefined rules.
                  Ideal for customer support, FAQ handling, and routine communications.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setHelpDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Unsaved Changes Dialog */}
        <Dialog open={unsavedChangesDialog} onOpenChange={setUnsavedChangesDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved changes. Would you like to save before continuing?
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setUnsavedChangesDialog(false)}
              >
                Discard
              </Button>
              <Button 
                onClick={() => {
                  saveProgress();
                  setUnsavedChangesDialog(false);
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default AppletBuilder;