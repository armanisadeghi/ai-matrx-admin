import React, { useState } from 'react';
import { CheckIcon, ClipboardIcon, DownloadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppletConfig } from '../ConfigBuilder';

interface PreviewConfigProps {
  config: Partial<AppletConfig>;
}

export const PreviewConfig: React.FC<PreviewConfigProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState('preview');
  const [copied, setCopied] = useState(false);

  const handleCopyToClipboard = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleDownloadJSON = () => {
    try {
      const dataStr = JSON.stringify(config, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `${config.id || 'applet'}-config.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Failed to download JSON:', error);
    }
  };

  const getTabsCount = () => config.tabs?.length || 0;
  
  const getGroupsCount = () => {
    if (!config.searchConfig) return 0;
    return Object.values(config.searchConfig).reduce((total, groups) => total + groups.length, 0);
  };
  
  const getFieldsCount = () => {
    if (!config.searchConfig) return 0;
    return Object.values(config.searchConfig).reduce((tabTotal, groups) => {
      return tabTotal + groups.reduce((groupTotal, group) => groupTotal + group.fields.length, 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-zinc-800 dark:text-zinc-200">
            {config.name || 'Untitled Applet'}
          </CardTitle>
          <CardDescription>
            {config.description || 'No description provided'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {getTabsCount()}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Tabs</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {getGroupsCount()}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">Groups</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {getFieldsCount()}
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Fields</p>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md">
              <TabsTrigger 
                value="preview" 
                className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm"
              >
                Preview
              </TabsTrigger>
              <TabsTrigger 
                value="json" 
                className="flex-1 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm"
              >
                JSON
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="mt-4">
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
                  <h3 className="font-medium text-zinc-800 dark:text-zinc-200">Applet Structure</h3>
                </div>
                
                <div className="p-4 bg-white dark:bg-zinc-900">
                  {config.tabs && config.tabs.length > 0 ? (
                    <ul className="space-y-4">
                      {config.tabs.map((tab) => (
                        <li key={tab.value} className="space-y-2">
                          <div className="flex items-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs mr-2">
                              T
                            </span>
                            <span className="font-medium text-zinc-800 dark:text-zinc-200">{tab.label}</span>
                            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">({tab.value})</span>
                          </div>
                          
                          {config.searchConfig && config.searchConfig[tab.value] && (
                            <ul className="pl-8 space-y-3">
                              {config.searchConfig[tab.value].map((group) => (
                                <li key={group.id} className="space-y-2">
                                  <div className="flex items-center">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs mr-2">
                                      G
                                    </span>
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{group.label}</span>
                                    <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">({group.id})</span>
                                  </div>
                                  
                                  {group.fields.length > 0 && (
                                    <ul className="pl-8 space-y-2">
                                      {group.fields.map((field) => (
                                        <li key={field.brokerId} className="flex items-center">
                                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs mr-2">
                                            F
                                          </span>
                                          <span className="text-zinc-600 dark:text-zinc-400">{field.label}</span>
                                          <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                            {field.type}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-zinc-600 dark:text-zinc-400">No tabs configured</p>
                  )}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="json" className="mt-4">
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <h3 className="font-medium text-zinc-800 dark:text-zinc-200">JSON Configuration</h3>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCopyToClipboard}
                      className="h-8 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {copied ? (
                        <>
                          <CheckIcon className="h-3.5 w-3.5 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <ClipboardIcon className="h-3.5 w-3.5 mr-1" />
                          Copy JSON
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDownloadJSON}
                      className="h-8 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      <DownloadIcon className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                
                <pre className="p-4 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-sm font-mono overflow-auto max-h-[500px]">
                  {JSON.stringify(config, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}; 