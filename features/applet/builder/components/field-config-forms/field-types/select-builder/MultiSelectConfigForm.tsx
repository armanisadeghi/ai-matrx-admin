// Main Component
import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IdentificationTab } from './IdentificationTab';
import { OptionsTab } from './OptionsTab';
import { SettingsTab } from './SettingsTab';
import { ExtrasTab } from './ExtrasTab';
import { MultiSelectFieldConfig, SelectOption } from '../../../../../runner/components/field-components/types';

interface MultiSelectConfigFormProps {
  config: Partial<MultiSelectFieldConfig>;
  onChange: (config: Partial<MultiSelectFieldConfig>) => void;
}

export const MultiSelectConfigForm: React.FC<MultiSelectConfigFormProps> = ({
  config,
  onChange
}) => {
  return (
    <div className="h-full flex flex-col" style={{ height: '750px' }}>
      <div className="border-b border-zinc-200 dark:border-zinc-700 p-4">
        <h3 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">MultiSelect Configuration</h3>
      </div>
      
      <Tabs defaultValue="identification" className="flex-1 flex flex-col">
        <div className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <TabsList className="flex w-full justify-start p-0">
            <TabsTrigger value="identification" className="py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Identification
            </TabsTrigger>
            <TabsTrigger value="options" className="py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Options
            </TabsTrigger>
            <TabsTrigger value="settings" className="py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Settings
            </TabsTrigger>
            <TabsTrigger value="extras" className="py-3 px-4 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Extras
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          <TabsContent value="identification" className="mt-0 h-full">
            <IdentificationTab config={config} onChange={onChange} />
          </TabsContent>
          
          <TabsContent value="options" className="mt-0 h-full">
            <OptionsTab config={config} onChange={onChange} />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-0 h-full">
            <SettingsTab config={config} onChange={onChange} />
          </TabsContent>
          
          <TabsContent value="extras" className="mt-0 h-full">
            <ExtrasTab config={config} onChange={onChange} />
          </TabsContent>
        </div>
      </Tabs>
      
      <div className="border-t border-zinc-200 dark:border-zinc-700 p-4 bg-zinc-50 dark:bg-zinc-900 flex justify-end space-x-2">
        <button className="px-4 py-2 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-700">
          Cancel
        </button>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
          Save Configuration
        </button>
      </div>
    </div>
  );
};

export default MultiSelectConfigForm;