'use client';
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, X, Menu, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

interface EditTabLayoutProps {
  title: string;
  subtitle?: string;
  tabs: TabItem[];
  id: string;
  onSave: () => Promise<void>;
  hasChanges: boolean;
}

export default function EditTabLayout({ 
  title, 
  subtitle, 
  tabs, 
  id, 
  onSave,
  hasChanges
}: EditTabLayoutProps) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const router = useRouter();
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  const handleBack = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push(`/apps/app-builder/applets/${id}`);
      }
    } else {
      router.push(`/apps/app-builder/applets/${id}`);
    }
  };
  
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave();
      toast({
        title: "Changes saved",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save changes:', error);
      toast({
        title: "Failed to save changes",
        description: "An error occurred while saving your changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('Are you sure you want to discard all changes?')) {
        router.push(`/apps/app-builder/applets/${id}`);
      }
    } else {
      router.push(`/apps/app-builder/applets/${id}`);
    }
  };
  
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };
  
  return (
    <div className="space-y-6 pb-20">      
      {/* Tabs moved outside the flex container */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Desktop Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 hidden md:block overflow-x-auto">
          <TabsList className="bg-transparent p-0 h-auto flex flex-wrap justify-start">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="py-2 px-1.5 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                <div className="flex items-center space-x-1">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        
        {/* Mobile Dropdown */}
        <div className="md:hidden border-b border-gray-200 dark:border-gray-700 pb-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-4 w-4 mr-1" />
                  <span>Tabs</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {tabs.map((tab) => (
                  <DropdownMenuItem key={tab.id} onClick={() => handleTabChange(tab.id)}>
                    <div className="flex items-center space-x-2">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Content area with flex layout for editor and preview */}
        <div className={`flex flex-col ${showPreview ? 'md:flex-row' : ''} gap-6 mt-4`}>
          <div className={`${showPreview ? 'md:w-1/3' : 'w-full'}`}>
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id}>
                {tab.content}
              </TabsContent>
            ))}
          </div>
          
          {showPreview && (
            <div className="md:w-2/3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 h-[calc(100vh-500px)] sticky top-4">
              <div className="text-center p-4 h-full flex flex-col items-center justify-center">
                <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">Applet Preview</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  A live preview of your applet will appear here as you make changes.
                </p>
              </div>
            </div>
          )}
        </div>
      </Tabs>
      
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}