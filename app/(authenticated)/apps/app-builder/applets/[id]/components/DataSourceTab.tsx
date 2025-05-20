'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppletSourceConfig, RecipeSourceConfig, WorkflowSourceConfig, ApiSourceConfig, DatabaseSourceConfig, OtherSourceConfig } from '../page';

interface DataSourceTabProps {
  dataSourceConfig?: AppletSourceConfig;
}

export default function DataSourceTab({ dataSourceConfig }: DataSourceTabProps) {
  if (!dataSourceConfig || !dataSourceConfig.sourceType) {
    return (
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Data Source</h3>
          <p className="text-gray-500 dark:text-gray-400">No data source configuration found for this applet.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">
          Data Source
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This applet uses a {dataSourceConfig.sourceType} data source.
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Source Type:</p>
            <Badge className="text-white" style={{ 
              backgroundColor: getSourceTypeColor(dataSourceConfig.sourceType) 
            }}>
              {dataSourceConfig.sourceType}
            </Badge>
          </div>

          {dataSourceConfig.config && (
            <SourceConfigDetails sourceType={dataSourceConfig.sourceType} config={dataSourceConfig.config} />
          )}
        </div>
      </Card>
    </div>
  );
}

function getSourceTypeColor(sourceType: string): string {
  const colorMap: Record<string, string> = {
    'recipe': '#8b5cf6', // Purple
    'workflow': '#3b82f6', // Blue
    'api': '#10b981', // Green
    'database': '#f59e0b', // Amber
    'other': '#6b7280', // Gray
  };

  return colorMap[sourceType] || '#6b7280';
}

function SourceConfigDetails({ 
  sourceType, 
  config 
}: { 
  sourceType: string; 
  config: RecipeSourceConfig | WorkflowSourceConfig | ApiSourceConfig | DatabaseSourceConfig | OtherSourceConfig;
}) {
  const renderConfigContent = () => {
    switch (sourceType) {
      case 'recipe':
        return <RecipeSourceDetails config={config as RecipeSourceConfig} />;
      case 'workflow':
        return <WorkflowSourceDetails config={config as WorkflowSourceConfig} />;
      default:
        return <GenericSourceDetails config={config} />;
    }
  };

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
      <h4 className="text-md font-medium mb-4 text-gray-700 dark:text-gray-300">Configuration Details</h4>
      {renderConfigContent()}
    </div>
  );
}

function RecipeSourceDetails({ config }: { config: RecipeSourceConfig }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</p>
          <p className="text-gray-900 dark:text-gray-100">{config.id}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Compiled ID</p>
          <p className="text-gray-900 dark:text-gray-100">{config.compiledId}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Version</p>
          <p className="text-gray-900 dark:text-gray-100">{config.version}</p>
        </div>
      </div>
      
      {config.neededBrokers && config.neededBrokers.length > 0 && (
        <div className="mt-6">
          <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Needed Brokers ({config.neededBrokers.length})</h5>
          <div className="space-y-2">
            {config.neededBrokers.map(broker => (
              <Card key={broker.id} className="p-3 border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">ID</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{broker.id}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Name</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{broker.name}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Data Type</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{broker.dataType}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Required</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{broker.required ? 'Yes' : 'No'}</p>
                  </div>
                  
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Default Value</p>
                    <p className="text-sm text-gray-900 dark:text-gray-100">{broker.defaultValue || '—'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowSourceDetails({ config }: { config: WorkflowSourceConfig }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">ID</p>
        <p className="text-gray-900 dark:text-gray-100">{config.id}</p>
      </div>
      
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Workflow ID</p>
        <p className="text-gray-900 dark:text-gray-100">{config.workflowId}</p>
      </div>
      
      {/* Render other workflow-specific properties */}
      {Object.entries(config)
        .filter(([key]) => !['sourceType', 'id', 'workflowId'].includes(key))
        .map(([key, value]) => (
          <div key={key} className="col-span-2">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{key}</p>
            <p className="text-gray-900 dark:text-gray-100">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </p>
          </div>
        ))
      }
    </div>
  );
}

function GenericSourceDetails({ config }: { config: any }) {
  return (
    <div>
      <pre className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md overflow-auto text-xs text-gray-900 dark:text-gray-100">
        {JSON.stringify(config, null, 2)}
      </pre>
    </div>
  );
} 