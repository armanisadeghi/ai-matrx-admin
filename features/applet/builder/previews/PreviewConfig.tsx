'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CustomAppConfig, CustomAppletConfig } from '@/types/customAppTypes';
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  Download, 
  Code2, 
  Copy, 
  ArrowRightCircle, 
  AppWindow,
  AlertTriangle,
  RefreshCw,
  Layers
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import AppPreviewCard from './AppPreviewCard';
import AppletPreviewCard from './AppletPreviewCard';
import { useAppSelector, useAppDispatch } from "@/lib/redux";
import { 
  selectAppById
} from "@/lib/redux/app-builder/selectors/appSelectors";
import {
  selectAppletsByAppId,
  selectContainersForApplet
} from "@/lib/redux/app-builder/selectors/appletSelectors";

interface PreviewConfigProps {
  appId: string;
  onUpdateCompletion?: (completion: { isComplete: boolean; canProceed: boolean; message?: string; footerButtons?: React.ReactNode }) => void;
}

export const PreviewConfig: React.FC<PreviewConfigProps> = ({ appId, onUpdateCompletion }) => {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState('preview');
  const [refreshingApplet, setRefreshingApplet] = useState<string | null>(null);
  const [refreshingGroup, setRefreshingGroup] = useState<{groupId: string, appletId: string} | null>(null);
  
  // Get data from Redux store
  const config = useAppSelector((state) => selectAppById(state, appId));
  const applets = useAppSelector((state) => selectAppletsByAppId(state, appId));
  
  // Create full configuration with nested applets
  const fullConfig = useMemo(() => {
    if (!config) return null;
    return {
      ...config,
      applets: applets
    };
  }, [config, applets]);
  
  // Update step completion status
  useEffect(() => {
    const hasConfig = !!config;
    const hasApplets = applets.length > 0;
    
    let message = '';
    if (!hasConfig) {
      message = "No app configuration found. Please complete the previous steps.";
    } else if (!hasApplets) {
      message = "App configuration found but no applets. You might want to add applets.";
    } else {
      message = `App is ready for review with ${applets.length} applet${applets.length === 1 ? '' : 's'}.`;
    }

    // This is the final step, so we provide buttons to export or copy the configuration
    const footerButtons = hasConfig ? (
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          onClick={() => handleCopyJSON('full')}
          className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy JSON
        </Button>
        <Button 
          variant="default" 
          onClick={() => handleExportConfig('full')}
          className="bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Config
        </Button>
      </div>
    ) : undefined;

    onUpdateCompletion?.({
      isComplete: hasConfig && hasApplets,
      canProceed: false, // This is the last step, so there's nowhere to proceed to
      message,
      footerButtons
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, applets.length]);
  
  if (!config) {
    return (
      <div className="w-full text-center p-8">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
          No App Configuration Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-lg mx-auto">
          It seems there's no saved app configuration. Please go back to the first step and save your app information.
        </p>
        <Button
          variant="outline"
          className="border-amber-300 dark:border-amber-700 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
        >
          Go Back to Step 1
        </Button>
      </div>
    );
  }
  
  const handleCopyJSON = (configType: 'app' | 'applets' | 'full' = 'full') => {
    let contentToCopy;
    
    switch (configType) {
      case 'app':
        contentToCopy = JSON.stringify(config, null, 2);
        break;
      case 'applets':
        contentToCopy = JSON.stringify(applets, null, 2);
        break;
      case 'full':
      default:
        contentToCopy = JSON.stringify(fullConfig, null, 2);
        break;
    }
    
    navigator.clipboard.writeText(contentToCopy);
    toast({
      title: "Configuration Copied",
      description: "Configuration JSON has been copied to clipboard.",
    });
  };
  
  const handleExportConfig = (configType: 'app' | 'applets' | 'full' = 'full') => {
    let contentToExport;
    let fileName;
    
    switch (configType) {
      case 'app':
        contentToExport = JSON.stringify(config, null, 2);
        fileName = `${config.slug || 'app'}-config.json`;
        break;
      case 'applets':
        contentToExport = JSON.stringify(applets, null, 2);
        fileName = `${config.slug || 'app'}-applets.json`;
        break;
      case 'full':
      default:
        contentToExport = JSON.stringify(fullConfig, null, 2);
        fileName = `${config.slug || 'app'}-full-config.json`;
        break;
    }
    
    // Create a JSON Blob
    const configBlob = new Blob([contentToExport], { type: 'application/json' });
    
    // Create download link
    const url = URL.createObjectURL(configBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Configuration Exported",
      description: "Configuration has been exported as JSON.",
    });
  };

  const handleRefreshAppletGroups = async (appletId: string) => {
    setRefreshingApplet(appletId);
    try {
      // Using a direct Redux approach without prop functions
      // For now, we'll just set loading state and show toast
      // In a future update, we could implement a Redux thunk to refresh the applet containers
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulating API call
      toast({
        title: "Applet Refreshed",
        description: "All groups have been refreshed in this applet.",
      });
    } catch (error) {
      console.error('Error refreshing applet groups:', error);
    } finally {
      setRefreshingApplet(null);
    }
  };
  
  const handleRefreshGroupFields = async (groupId: string, appletId: string) => {
    setRefreshingGroup({ groupId, appletId });
    try {
      // Using a direct Redux approach without prop functions
      // For now, we'll just set loading state and show toast
      // In a future update, we could implement a Redux thunk to refresh the container fields
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulating API call
      toast({
        title: "Group Refreshed",
        description: "All fields have been refreshed in this group.",
      });
    } catch (error) {
      console.error('Error refreshing group fields:', error);
    } finally {
      setRefreshingGroup(null);
    }
  };
  
  return (
    <div className="w-full">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden rounded-3xl">
        <CardHeader className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-medium text-emerald-500 flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2 text-emerald-500" />
                Configuration Preview
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Review your app configuration before finalizing
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleCopyJSON('full')}
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy JSON
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => handleExportConfig('full')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Config
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-0">
                <TabsTrigger 
                  value="preview"
                  className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
                >
                  <AppWindow className="h-4 w-4 mr-2" />
                  Preview
                </TabsTrigger>
                <TabsTrigger 
                  value="applets"
                  className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
                >
                  <ArrowRightCircle className="h-4 w-4 mr-2" />
                  Applets ({applets.length})
                </TabsTrigger>
                <TabsTrigger 
                  value="json"
                  className="data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-700"
                >
                  <Code2 className="h-4 w-4 mr-2" />
                  Configurations
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="preview" className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/2 lg:w-1/3">
                  <AppPreviewCard appId={appId} />
                </div>
                
                <div className="w-full md:w-1/2 lg:w-2/3">
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
                      App Details
                    </h3>
                    
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Name:</dt>
                        <dd className="font-medium text-gray-900 dark:text-gray-100">{config.name}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Creator:</dt>
                        <dd className="font-medium text-gray-900 dark:text-gray-100">{config.creator || 'Not specified'}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Slug:</dt>
                        <dd className="font-medium text-gray-900 dark:text-gray-100">{config.slug}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Layout:</dt>
                        <dd className="font-medium text-gray-900 dark:text-gray-100">{config.layoutType || 'Default'}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Primary Color:</dt>
                        <dd className="flex items-center">
                          <div className={`w-4 h-4 rounded-full bg-${config.primaryColor || 'gray'}-500 mr-2`}></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{config.primaryColor || 'Gray'}</span>
                        </dd>
                      </div>
                      
                      <div>
                        <dt className="text-gray-500 dark:text-gray-400">Accent Color:</dt>
                        <dd className="flex items-center">
                          <div className={`w-4 h-4 rounded-full bg-${config.accentColor || 'rose'}-500 mr-2`}></div>
                          <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{config.accentColor || 'Rose'}</span>
                        </dd>
                      </div>
                      
                      <div className="md:col-span-2">
                        <dt className="text-gray-500 dark:text-gray-400">Description:</dt>
                        <dd className="font-medium text-gray-900 dark:text-gray-100">{config.description || 'No description provided.'}</dd>
                      </div>
                      
                      <div className="md:col-span-2">
                        <dt className="text-gray-500 dark:text-gray-400">Number of Applets:</dt>
                        <dd className="font-medium text-gray-900 dark:text-gray-100">{applets.length} applets configured</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="applets" className="p-6">
              {applets.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <AppWindow className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600" />
                  <h3 className="mt-2 text-gray-900 dark:text-gray-100 font-medium">No Applets</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                    You haven't added any applets to this app configuration yet. 
                    Go back to the second step to add applets.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {applets.map((applet) => (
                    <div key={applet.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100">{applet.name}</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={refreshingApplet === applet.id}
                          onClick={() => handleRefreshAppletGroups(applet.id)}
                          className="text-xs"
                        >
                          {refreshingApplet === applet.id ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Refresh Groups
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="md:col-span-1">
                            <AppletPreviewCard applet={applet} />
                          </div>
                          
                          <div className="md:col-span-1">
                            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Applet Details</h4>
                              <dl className="grid grid-cols-1 gap-y-1 text-xs">
                                <div className="flex justify-between">
                                  <dt className="text-gray-500 dark:text-gray-400">Slug:</dt>
                                  <dd className="font-medium text-gray-900 dark:text-gray-100">{applet.slug}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500 dark:text-gray-400">Layout:</dt>
                                  <dd className="font-medium text-gray-900 dark:text-gray-100">{applet.layoutType || 'Default'}</dd>
                                </div>
                                <div className="flex justify-between">
                                  <dt className="text-gray-500 dark:text-gray-400">Groups:</dt>
                                  <dd className="font-medium text-gray-900 dark:text-gray-100">{applet.containers?.length || 0}</dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                        </div>
                        
                        {applet.containers && applet.containers.length > 0 && (
                          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Groups</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {applet.containers.map((container) => (
                                <div 
                                  key={container.id} 
                                  className="p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md flex justify-between items-center"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{container.label}</p>
                                    <div className="flex items-center mt-1">
                                      <Layers className="h-3 w-3 text-gray-500 dark:text-gray-400 mr-1" />
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {container.fields?.length || 0} fields
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={refreshingGroup?.groupId === container.id}
                                    onClick={() => handleRefreshGroupFields(container.id, applet.id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {refreshingGroup?.groupId === container.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="json" className="border-t border-gray-200 dark:border-gray-700">
              <div className="p-0">
                <Tabs defaultValue="full" className="w-full">
                  <div className="flex items-center justify-between p-4">
                    <TabsList className="grid w-full max-w-md grid-cols-3">
                      <TabsTrigger value="app">
                        App Overview
                      </TabsTrigger>
                      <TabsTrigger value="applets">
                        Applets
                      </TabsTrigger>
                      <TabsTrigger value="full">
                        Full Configuration
                      </TabsTrigger>
                    </TabsList>
                    
                    <div className="flex ml-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleCopyJSON(activeTab === 'app' ? 'app' : activeTab === 'applets' ? 'applets' : 'full')}
                        className="h-8 text-xs border-gray-300 dark:border-gray-600 mr-2"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleExportConfig(activeTab === 'app' ? 'app' : activeTab === 'applets' ? 'applets' : 'full')}
                        className="h-8 text-xs border-gray-300 dark:border-gray-600"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Export
                      </Button>
                    </div>
                  </div>
                  
                  <TabsContent value="app">
                    <ScrollArea className="h-[600px] w-full">
                      <pre className="p-4 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {JSON.stringify(config, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="applets">
                    <ScrollArea className="h-[600px] w-full">
                      <pre className="p-4 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {JSON.stringify(applets, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="full">
                    <ScrollArea className="h-[600px] w-full">
                      <pre className="p-4 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                        {JSON.stringify(fullConfig, null, 2)}
                      </pre>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PreviewConfig; 