import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const FeaturesStep = ({ 
  selectedFeatures, 
  onFeatureToggle, 
  onPrevious, 
  onNext 
}) => {
  // Features configuration
  const features = [
    {
      id: 'nlp',
      title: 'Natural Language Processing',
      description: 'Add text analysis and language understanding'
    },
    {
      id: 'imageRecognition',
      title: 'Image Recognition',
      description: 'Identify objects and patterns in images'
    },
    {
      id: 'sentimentAnalysis',
      title: 'Sentiment Analysis',
      description: 'Understand emotions and opinions in text'
    },
    {
      id: 'dataPrediction',
      title: 'Data Prediction',
      description: 'Forecast trends and make predictions'
    },
    {
      id: 'automatedResponses',
      title: 'Automated Responses',
      description: 'Generate replies based on predefined rules'
    }
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <h1 className="text-2xl font-bold text-gray-900">Add AI Features</h1>
        <p className="text-gray-500 mb-6">Choose features for your applet</p>
        
        <div className="space-y-4">
          {features.map((feature) => (
            <div 
              key={feature.id}
              className={`p-4 rounded-lg border transition-all cursor-pointer ${
                selectedFeatures[feature.id] 
                  ? 'bg-indigo-50 border-indigo-200' 
                  : 'bg-white hover:bg-gray-50 border-gray-200'
              }`}
              onClick={() => onFeatureToggle(feature.id)}
            >
              <div className="flex items-start">
                <Checkbox 
                  id={feature.id}
                  checked={selectedFeatures[feature.id]}
                  onCheckedChange={() => onFeatureToggle(feature.id)}
                  className="mt-1"
                />
                <div className="ml-3">
                  <label 
                    htmlFor={feature.id}
                    className="font-medium text-gray-900 cursor-pointer"
                  >
                    {feature.title}
                  </label>
                  <p className="text-gray-500 text-sm">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between mt-8">
          <Button 
            variant="outline" 
            onClick={onPrevious}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button onClick={onNext}>
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturesStep;