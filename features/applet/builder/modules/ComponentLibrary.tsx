'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { DownloadIcon, UploadIcon, DatabaseIcon, FileIcon, AppWindowIcon, BoxIcon, LayersIcon, CheckIcon } from 'lucide-react';
import { SavedApplet } from './applet-builder/AppletBuilder';
import { SavedGroup } from './group-builder/GroupBuilder';
import { FieldDefinition } from './field-builder/types';
import { CustomAppConfig } from './app-builder/customAppService';

type AppPartType = 'app' | 'applet' | 'group' | 'field';

const ComponentLibrary = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('export');
  const [componentType, setComponentType] = useState<AppPartType>('app');
  const [exportData, setExportData] = useState<string>('');
  const [importData, setImportData] = useState<string>('');
  const [savedApps, setSavedApps] = useState<CustomAppConfig[]>([]);
  const [savedApplets, setSavedApplets] = useState<SavedApplet[]>([]);
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [savedFields, setSavedFields] = useState<FieldDefinition[]>([]);
  const [copied, setCopied] = useState(false);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    // Load saved apps
    const storedApps = localStorage.getItem('savedApps');
    if (storedApps) {
      try {
        setSavedApps(JSON.parse(storedApps));
      } catch (e) {
        console.error('Failed to parse saved apps', e);
      }
    }
    
    // Load saved applets
    const storedApplets = localStorage.getItem('savedApplets');
    if (storedApplets) {
      try {
        setSavedApplets(JSON.parse(storedApplets));
      } catch (e) {
        console.error('Failed to parse saved applets', e);
      }
    }
    
    // Load saved groups
    const storedGroups = localStorage.getItem('savedGroups');
    if (storedGroups) {
      try {
        setSavedGroups(JSON.parse(storedGroups));
      } catch (e) {
        console.error('Failed to parse saved groups', e);
      }
    }
    
    // Load saved fields
    const storedFields = localStorage.getItem('savedFields');
    if (storedFields) {
      try {
        setSavedFields(JSON.parse(storedFields));
      } catch (e) {
        console.error('Failed to parse saved fields', e);
      }
    }
  }, []);

  // Generate export data when component type changes
  useEffect(() => {
    generateExportData();
  }, [componentType, savedApps, savedApplets, savedGroups, savedFields]);

  const generateExportData = () => {
    let dataToExport: any[] = [];
    
    switch (componentType) {
      case 'app':
        dataToExport = savedApps;
        break;
      case 'applet':
        dataToExport = savedApplets;
        break;
      case 'group':
        dataToExport = savedGroups;
        break;
      case 'field':
        dataToExport = savedFields;
        break;
    }
    
    if (dataToExport.length > 0) {
      const exportObj = {
        type: componentType,
        data: dataToExport,
        exportDate: new Date().toISOString()
      };
      setExportData(JSON.stringify(exportObj, null, 2));
    } else {
      setExportData(`No ${componentType}s available to export.`);
    }
  };

  const handleComponentTypeChange = (type: string) => {
    setComponentType(type as AppPartType);
  };

  const handleImportDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setImportData(e.target.value);
  };

  const copyExportData = () => {
    navigator.clipboard.writeText(exportData);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Copied to Clipboard",
      description: "Export data has been copied to clipboard.",
    });
  };

  const importComponents = () => {
    if (!importData.trim()) {
      toast({
        title: "Import Error",
        description: "Please enter valid JSON data to import.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const importObj = JSON.parse(importData);
      
      if (!importObj.type || !importObj.data || !Array.isArray(importObj.data)) {
        throw new Error('Invalid import format');
      }
      
      switch (importObj.type) {
        case 'app':
          // Merge with existing apps, avoiding duplicates by ID
          const mergedApps = [...savedApps];
          importObj.data.forEach((app: CustomAppConfig) => {
            const existingIndex = mergedApps.findIndex(a => a.id === app.id);
            if (existingIndex === -1) {
              mergedApps.push(app);
            }
          });
          localStorage.setItem('savedApps', JSON.stringify(mergedApps));
          setSavedApps(mergedApps);
          break;
          
        case 'applet':
          // Merge with existing applets, avoiding duplicates by ID
          const mergedApplets = [...savedApplets];
          importObj.data.forEach((applet: SavedApplet) => {
            const existingIndex = mergedApplets.findIndex(a => a.id === applet.id);
            if (existingIndex === -1) {
              mergedApplets.push(applet);
            }
          });
          localStorage.setItem('savedApplets', JSON.stringify(mergedApplets));
          setSavedApplets(mergedApplets);
          break;
          
        case 'group':
          // Merge with existing groups, avoiding duplicates by ID
          const mergedGroups = [...savedGroups];
          importObj.data.forEach((group: SavedGroup) => {
            const existingIndex = mergedGroups.findIndex(g => g.id === group.id);
            if (existingIndex === -1) {
              mergedGroups.push(group);
            }
          });
          localStorage.setItem('savedGroups', JSON.stringify(mergedGroups));
          setSavedGroups(mergedGroups);
          break;
          
        case 'field':
          // Merge with existing fields, avoiding duplicates by ID
          const mergedFields = [...savedFields];
          importObj.data.forEach((field: FieldDefinition) => {
            const existingIndex = mergedFields.findIndex(f => f.id === field.id);
            if (existingIndex === -1) {
              mergedFields.push(field);
            }
          });
          localStorage.setItem('savedFields', JSON.stringify(mergedFields));
          setSavedFields(mergedFields);
          break;
          
        default:
          throw new Error(`Unsupported component type: ${importObj.type}`);
      }
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${importObj.data.length} ${importObj.type}(s).`,
      });
      
      setImportData('');
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Error",
        description: "Failed to parse import data. Please ensure it's valid JSON.",
        variant: "destructive",
      });
    }
  };

  const downloadExportFile = () => {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${componentType}-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: `${componentType} data is being downloaded.`,
    });
  };

  const getComponentTypeIcon = () => {
    switch (componentType) {
      case 'app':
        return <AppWindowIcon className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />;
      case 'applet':
        return <BoxIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />;
      case 'group':
        return <LayersIcon className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
      case 'field':
        return <FileIcon className="h-5 w-5 text-rose-500 dark:text-rose-400" />;
      default:
        return <DatabaseIcon className="h-5 w-5" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-blue-500 dark:text-blue-400">Component Library</CardTitle>
          <CardDescription className="text-gray-500 dark:text-gray-400">
            Import and export components for reuse
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <TabsTrigger 
                value="export"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                Export Components
              </TabsTrigger>
              <TabsTrigger 
                value="import"
                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
              >
                Import Components
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="mt-6">
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-gray-900 dark:text-gray-100">Component Type</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button
                      variant={componentType === 'app' ? 'default' : 'outline'}
                      onClick={() => handleComponentTypeChange('app')}
                      className={componentType === 'app' 
                        ? 'bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}
                    >
                      <AppWindowIcon className="h-4 w-4 mr-2" />
                      Apps ({savedApps.length})
                    </Button>
                    
                    <Button
                      variant={componentType === 'applet' ? 'default' : 'outline'}
                      onClick={() => handleComponentTypeChange('applet')}
                      className={componentType === 'applet' 
                        ? 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}
                    >
                      <BoxIcon className="h-4 w-4 mr-2" />
                      Applets ({savedApplets.length})
                    </Button>
                    
                    <Button
                      variant={componentType === 'group' ? 'default' : 'outline'}
                      onClick={() => handleComponentTypeChange('group')}
                      className={componentType === 'group' 
                        ? 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}
                    >
                      <LayersIcon className="h-4 w-4 mr-2" />
                      Groups ({savedGroups.length})
                    </Button>
                    
                    <Button
                      variant={componentType === 'field' ? 'default' : 'outline'}
                      onClick={() => handleComponentTypeChange('field')}
                      className={componentType === 'field' 
                        ? 'bg-rose-500 hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-700 text-white' 
                        : 'border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100'}
                    >
                      <FileIcon className="h-4 w-4 mr-2" />
                      Fields ({savedFields.length})
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      {getComponentTypeIcon()}
                      Export Data
                    </Label>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyExportData}
                        className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        {copied ? <CheckIcon className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadExportFile}
                        className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <DownloadIcon className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={exportData}
                    readOnly
                    className="font-mono text-sm resize-none h-80 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="import" className="mt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-gray-900 dark:text-gray-100">Import JSON Data</Label>
                  <Textarea
                    value={importData}
                    onChange={handleImportDataChange}
                    placeholder="Paste JSON export data here..."
                    className="font-mono text-sm resize-none h-80 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Note: Import will merge with existing data. Duplicate IDs will be skipped.
                  </p>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    onClick={importComponents}
                    className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  >
                    <UploadIcon className="h-4 w-4 mr-2" />
                    Import Components
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <Toaster />
    </div>
  );
};

export default ComponentLibrary; 