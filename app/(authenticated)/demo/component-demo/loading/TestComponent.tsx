'use client';

import React, { useState } from 'react';
import ControlledLoadingIndicator, { InputControlsSettings, FEATURE_CONFIG } from '@/features/chat/components/response/chat-loading/ControlledLoadingIndicator';

export default function LoadingComponentTester() {
  const [settings, setSettings] = useState<InputControlsSettings>({
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
  });

  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleSetting = (setting: keyof InputControlsSettings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: `Response to: "${input}"` }]);
      setIsLoading(false);
    }, 15000);
  };

  const getFeatureInfo = () => {
    let featureCount = 0;
    let stepCount = 0;

    Object.entries(settings).forEach(([key, isEnabled]) => {
      const typedKey = key as keyof typeof FEATURE_CONFIG;
      if (isEnabled && typedKey in FEATURE_CONFIG) {
        featureCount++;
        stepCount += FEATURE_CONFIG[typedKey].steps.length;
      }
    });

    return { featureCount, stepCount };
  };

  const { featureCount, stepCount } = getFeatureInfo();

  return (
    <div className="flex flex-col h-full w-full p-4">
      <h1 className="text-2xl font-bold mb-4">Loading Indicator Test</h1>

      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Settings:</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {Object.keys(settings).map((key) => {
            const typedKey = key as keyof typeof FEATURE_CONFIG;
            const steps = FEATURE_CONFIG[typedKey]?.steps || [];
            const hasMultipleSteps = steps.length > 1;

            return (
              <label key={key} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[key as keyof InputControlsSettings]}
                  onChange={() => toggleSetting(key as keyof InputControlsSettings)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm flex-1">{key}</span>
                {hasMultipleSteps && (
                  <span className="text-xs text-gray-500">({steps.length} steps)</span>
                )}
              </label>
            );
          })}
        </div>

        <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
          <div className="text-sm mb-2">
            Preview: {featureCount} features, {stepCount} steps
          </div>
          <ControlledLoadingIndicator settings={settings} />
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto mb-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-3 rounded-lg max-w-xs sm:max-w-md ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="mb-4">
            <div className="inline-block p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
              <ControlledLoadingIndicator settings={settings} />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
          className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !input.trim()}
          className="bg-blue-500 text-white p-2 rounded-r-lg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}