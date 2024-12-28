// SettingsSidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useMeasure } from "@uidotdev/usehooks";
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Save, Upload, Code, Settings } from 'lucide-react';
import { ModelInfoCard, ModelSettings } from './ModelInfoCard';
import { MetricsCard } from './MetricsCard';
import { ResourcesSection } from './ResourcesSection';
import { SettingsPanel } from './SettingsPanel';



export const SettingsSidebar = () => {
  const [ref, { height }] = useMeasure();
  const [activeTab, setActiveTab] = useState('model1');
  const [isNarrow, setIsNarrow] = useState(false);
  const [modelSettings, setModelSettings] = useState<Record<string, ModelSettings>>({
    model1: {
        provider: '',
        model: '',
        temperature: 0,
        maxTokens: 0,
        streamResponse: false,
        responseFormat: '',
        enabledTools: []
    },
    model2:  {
        provider: '',
        model: '',
        temperature: 0,
        maxTokens: 0,
        streamResponse: false,
        responseFormat: '',
        enabledTools: []
    },
    model3:  {
        provider: '',
        model: '',
        temperature: 0,
        maxTokens: 0,
        streamResponse: false,
        responseFormat: '',
        enabledTools: []
    },
    model4:  {
        provider: '',
        model: '',
        temperature: 0,
        maxTokens: 0,
        streamResponse: false,
        responseFormat: '',
        enabledTools: []
    },
  });

  // Check viewport width for responsive tab labels
  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 640);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const updateModelSettings = (modelId: string, settings: Partial<ModelSettings>) => {
    setModelSettings(prev => ({
      ...prev,
      [modelId]: { ...prev[modelId], ...settings }
    }));
  };

  return (
    <div ref={ref} className="h-full flex flex-col bg-background overflow-hidden">
      <div className="flex flex-col min-h-0">
        {/* Fixed Header Section */}
        <div className="p-2 space-y-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 bg-elevation1">
              {[1, 2, 3, 4].map((num) => (
                <TabsTrigger
                  key={num}
                  value={`model${num}`}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {isNarrow ? `M${num}` : `Model ${num}`}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex gap-2 items-center">
            <select className="flex-1 bg-elevation1 rounded-md p-2 text-sm">
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Google</option>
            </select>
            
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Save size={16} />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Upload size={16} />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9">
              <Code size={16} />
            </Button>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-4">
            <ModelInfoCard 
              model="GPT-4 Turbo"
              version="Latest: Mar 2024"
              context="128k context"
            />
            
            <SettingsPanel 
              settings={modelSettings[activeTab]}
              onChange={(settings) => updateModelSettings(activeTab, settings)}
            />

            <Button variant="outline" className="w-full">
              <Settings size={16} className="mr-2" />
              Advanced Settings
            </Button>
          </div>
        </div>

        {/* Fixed Footer Section */}
        <div className="mt-auto">
          <ResourcesSection />
          <MetricsCard />
        </div>
      </div>
    </div>
  );
};
