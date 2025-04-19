'use client';

import React, { useState } from 'react';
import ControlledLoadingIndicator, { InputControlsSettings, FEATURE_CONFIG } from '@/features/chat/components/response/chat-loading/ControlledLoadingIndicator';

export default function TestPage() {
  // State for input settings
  const [settings, setSettings] = useState<InputControlsSettings>({
    searchEnabled: false,
    toolsEnabled: false,
    thinkEnabled: false,
    researchEnabled: false,
    recipesEnabled: false,
    planEnabled: false,
    audioEnabled: false,
    enableAskQuestions: false,
    enableBrokers: false
  });
  
  // State for default display time control
  const [defaultDisplayTime, setDefaultDisplayTime] = useState(3000); // 3 seconds default
  
  // State for chat messages
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Toggle a setting
  const toggleSetting = (setting: keyof InputControlsSettings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    
    // Start loading
    setIsLoading(true);
    
    // Simulate response after delay
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `This is a response to: "${input}"` 
      }]);
      setIsLoading(false);
    }, 15000); // 15 second delay to show more loading cycles
  };
  
  // Count active features and steps
  const getFeatureInfo = () => {
    let featureCount = 0;
    let stepCount = 0;
    
    Object.entries(settings).forEach(([key, isEnabled]) => {
      if (isEnabled && key in FEATURE_CONFIG) {
        featureCount++;
        const typedKey = key as keyof typeof FEATURE_CONFIG;
        stepCount += FEATURE_CONFIG[typedKey].steps.length;
      }
    });
    
    return { featureCount, stepCount };
  };
  
  const { featureCount, stepCount } = getFeatureInfo();
  
  return (
    <div className="flex flex-col h-full w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Enhanced Loading Indicator Test</h1>
      
      {/* Settings Controls */}
      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Enable Features:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {Object.keys(settings).map((key) => {
            const typedKey = key as keyof typeof FEATURE_CONFIG;
            const hasMultipleSteps = FEATURE_CONFIG[typedKey]?.steps.length > 1;
            const displayTime = FEATURE_CONFIG[typedKey]?.displayTime || defaultDisplayTime;
            
            return (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key as keyof InputControlsSettings]}
                  onChange={() => toggleSetting(key as keyof InputControlsSettings)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm flex-1">{formatSettingName(key)}</span>
                <span className="text-xs text-gray-500">
                  {displayTime}ms
                  {hasMultipleSteps && <span className="ml-1">({FEATURE_CONFIG[typedKey].steps.length} steps)</span>}
                </span>
              </label>
            );
          })}
        </div>
        
        <div className="mt-3">
          <button 
            className="px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 mr-3 text-sm"
            onClick={() => setSettings({
              thinkEnabled: true,
              searchEnabled: true,
              toolsEnabled: true,
              researchEnabled: true,
              recipesEnabled: false,
              planEnabled: false,
              audioEnabled: false,
              enableAskQuestions: false,
              enableBrokers: false
            })}
          >
            Enable Common Set
          </button>
          
          <button 
            className="px-4 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 mr-3 text-sm"
            onClick={() => setSettings({
              thinkEnabled: true,
              searchEnabled: true,
              toolsEnabled: true,
              researchEnabled: true,
              recipesEnabled: true,
              planEnabled: true,
              audioEnabled: true,
              enableAskQuestions: true,
              enableBrokers: true
            })}
          >
            Enable All
          </button>
          
          <button 
            className="px-4 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            onClick={() => setSettings({
              searchEnabled: false,
              toolsEnabled: false,
              thinkEnabled: false,
              researchEnabled: false,
              recipesEnabled: false,
              planEnabled: false,
              audioEnabled: false,
              enableAskQuestions: false,
              enableBrokers: false
            })}
          >
            Clear All
          </button>
        </div>
        
        {/* Default display time control */}
        <div className="mt-4">
          <label className="block mb-2 text-sm font-medium">
            Default Display Time: {defaultDisplayTime}ms per step
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={defaultDisplayTime}
            onChange={(e) => setDefaultDisplayTime(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Fast (0.5s)</span>
            <span>Slow (5s)</span>
          </div>
        </div>
        
        {/* Preview */}
        <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <div className="text-sm mb-2">
            Preview: {featureCount} features, {stepCount} total steps
          </div>
          {featureCount > 0 ? (
            <ControlledLoadingIndicator 
              settings={settings} 
              defaultDisplayTime={defaultDisplayTime}
            />
          ) : (
            <p className="text-sm text-gray-500 italic">No features enabled</p>
          )}
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto mb-4">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div 
              className={`inline-block p-3 rounded-lg max-w-xs sm:max-w-md
                ${message.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                }
              `}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {/* Show loading indicator when waiting for response */}
        {isLoading && (
          <div className="mb-4">
            <div className="inline-block p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
              <ControlledLoadingIndicator 
                settings={settings} 
                defaultDisplayTime={defaultDisplayTime}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2
                     dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-blue-500 text-white p-2 rounded-r-lg disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// Helper function to format setting keys to readable names
function formatSettingName(key: string): string {
  // Remove 'enable' prefix if it exists
  let name = key.startsWith('enable') 
    ? key.substring(6) // Remove 'enable'
    : key.replace('Enabled', ''); // Remove 'Enabled' suffix
  
  // Add spaces before capital letters and capitalize first letter
  name = name.replace(/([A-Z])/g, ' $1').trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}