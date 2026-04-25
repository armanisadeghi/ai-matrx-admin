'use client';

import React, { useState, useEffect } from 'react';
import ControlledLoadingIndicator, { InputControlsSettings } from '@/features/chat/components/response/chat-loading/ControlledLoadingIndicator';

export default function MinimalLoadingTest() {
  const [searchOnly, setSearchOnly] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [allOff, setAllOff] = useState(true);
  
  // Keep settings synced to avoid multiple being on at once
  useEffect(() => {
    if (searchOnly) {
      setAudioOnly(false);
      setAllOff(false);
    } else if (audioOnly) {
      setSearchOnly(false);
      setAllOff(false);
    } else if (!searchOnly && !audioOnly) {
      setAllOff(true);
    }
  }, [searchOnly, audioOnly]);
  
  const getSettings = (): InputControlsSettings => {
    const baseSettings: InputControlsSettings = {
      searchEnabled: false,
      toolsEnabled: false,
      thinkEnabled: false,
      researchEnabled: false,
      recipesEnabled: false,
      planEnabled: false,
      audioEnabled: false,
      enableAskQuestions: false,
      enableBrokers: false,
      hasFiles: false,
      generateImages: false,
      generateVideos: false
    };
    
    if (searchOnly) {
      return { ...baseSettings, searchEnabled: true };
    } else if (audioOnly) {
      return { ...baseSettings, audioEnabled: true };
    } else {
      return baseSettings;
    }
  };
  
  const settings = getSettings();
  
  return (
    <div className="flex flex-col items-center p-6 gap-4">
      <h1 className="text-2xl font-bold mb-4">Minimal Loading Test</h1>
      
      <div className="flex gap-4 mb-4">
        <button 
          onClick={() => setSearchOnly(prev => !prev)}
          className={`px-4 py-2 rounded-lg ${
            searchOnly 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          Toggle Search Only
        </button>
        
        <button 
          onClick={() => setAudioOnly(prev => !prev)}
          className={`px-4 py-2 rounded-lg ${
            audioOnly 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          Toggle Audio Only
        </button>
      </div>
      
      <div className="mb-4 p-4 bg-textured rounded-lg border-border w-full max-w-md">
        <div className="text-sm font-semibold mb-2">
          Current Settings:
        </div>
        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-28">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>
      
      <div className="p-6 bg-textured rounded-lg border-border w-full max-w-md">
        <div className="text-sm font-semibold mb-4">Loading Indicator:</div>
        <div className="flex justify-center items-center h-20 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <ControlledLoadingIndicator settings={settings} />
        </div>
      </div>
    </div>
  );
} 