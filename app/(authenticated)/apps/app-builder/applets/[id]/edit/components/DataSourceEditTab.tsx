'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Workflow, Code } from 'lucide-react';
import { AppletSourceConfig } from '../../page';

interface DataSourceEditTabProps {
  dataSourceConfig?: AppletSourceConfig;
  onUpdate: (dataSourceConfig: AppletSourceConfig) => void;
}

export default function DataSourceEditTab({ dataSourceConfig, onUpdate }: DataSourceEditTabProps) {
  // Placeholder for data source selection
  const handleSourceTypeChange = (value: string) => {
    console.log('Selected source type:', value);
    // In a real implementation, this would update the data source type
  };

  const sourceTypes = [
    { id: 'recipe', label: 'Recipe', icon: <Code className="h-4 w-4 mr-2" /> },
    { id: 'workflow', label: 'Workflow', icon: <Workflow className="h-4 w-4 mr-2" /> },
    { id: 'database', label: 'Database', icon: <Database className="h-4 w-4 mr-2" /> },
    { id: 'api', label: 'API', icon: <Code className="h-4 w-4 mr-2" /> },
    { id: 'other', label: 'Other', icon: <Code className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Data Source Configuration
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Configure the data source for this applet.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Source Type</p>
              <Select 
                value={dataSourceConfig?.sourceType || ''} 
                onValueChange={handleSourceTypeChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a source type" />
                </SelectTrigger>
                <SelectContent>
                  {sourceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center">
                        {type.icon}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              Data source configuration editing will be implemented with dedicated components.
              This is a placeholder. The actual editing interface will depend on the selected source type.
            </p>
            
            {dataSourceConfig?.sourceType && (
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Currently using a {dataSourceConfig.sourceType} data source.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
} 