'use client';

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import SmartAppListWrapper from '@/features/applet/builder/components/smart-parts/SmartAppListWrapper';
import { CustomAppConfig } from '@/features/applet/builder/builder.types';
import { SmartAppListRefType } from './smart-parts/SmartAppList';

interface SelectAppStepProps {
  onAppSelected: (app: CustomAppConfig) => void;
  onCreateNewApp: () => void;
  selectedApp: CustomAppConfig | null;
}

export const SelectAppStep: React.FC<SelectAppStepProps> = ({
  onAppSelected,
  onCreateNewApp,
  selectedApp
}) => {
    const appListRef = useRef<SmartAppListRefType | null>(null);

  // If we already have a selected app, we should still show it in the list
  // but indicate it's selected
  const handleAppSelected = (app: CustomAppConfig) => {
    onAppSelected(app);
  };

  return (
    <div className="w-full">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-6">
        <CardHeader className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-rose-500 font-medium text-lg">Select or Create an App</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Choose an existing app to edit or create a new one from scratch
              </p>
            </div>
            
            <Button 
              onClick={onCreateNewApp}
              className="bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-2 md:self-start"
            >
              <PlusCircle className="h-4 w-4" />
              Create New App
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {selectedApp && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
              <h3 className="text-rose-600 dark:text-rose-400 font-medium mb-1">
                Currently Selected App
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-1">
                <span className="font-medium">{selectedApp.name}</span>
                {selectedApp.description && (
                  <span className="ml-2 text-gray-500 dark:text-gray-400">
                    — {selectedApp.description}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can continue working with this app or select a different one below.
              </p>
            </div>
          )}
          
          <SmartAppListWrapper
            ref={appListRef}
            onSelectApp={handleAppSelected}
            showCreateButton={true}
            onCreateApp={onCreateNewApp}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SelectAppStep; 