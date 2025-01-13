'use client';

import React from 'react';
import DynamicPromptSettings from '@/components/playground/settings/DynamicPromptSettings';

export default function DynamicPromptSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Main content area (empty for testing context) */}
        <div className="flex-1" />
        
        {/* Right sidebar simulation container */}
        <div className="w-80 min-h-screen border-l">
          <DynamicPromptSettings />
        </div>
      </div>
    </div>
  );
}