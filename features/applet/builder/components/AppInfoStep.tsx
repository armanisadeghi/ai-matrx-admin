'use client';

import React, { useState } from "react";
import { CustomAppConfig } from "@/features/applet/builder/builder.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { TailwindColorPicker } from '@/components/ui/TailwindColorPicker';
import { isAppSlugAvailable } from "@/lib/redux/app-builder/service/customAppService";
import AppPreviewCard from "@/features/applet/builder/previews/AppPreviewCard";
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";
import { IconPicker } from '@/components/ui/IconPicker';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appletLayoutOptionsArray } from '@/features/applet/layouts/options/layout-options';

interface AppInfoStepProps {
    config: Partial<CustomAppConfig>;
    updateConfig: (updates: Partial<CustomAppConfig>) => void;
    saveApp: () => void;
    isEdit: boolean;
}

export const AppInfoStep: React.FC<AppInfoStepProps> = ({ 
    config, 
    updateConfig,
    saveApp,
    isEdit 
}) => {
    const { toast } = useToast();
    const [slugError, setSlugError] = useState<string>('');
    const [isCheckingSlug, setIsCheckingSlug] = useState<boolean>(false);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        updateConfig({ [name]: value });
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        // Convert to kebab-case
        const slug = name.toLowerCase()
            .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase to kebab
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, ''); // Remove special characters
        
        updateConfig({ name, slug });
    };
    
    const handleSlugChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const slug = e.target.value;
        
        // Basic validation
        if (slug && !isValidSlug(slug)) {
            setSlugError('Slug can only contain lowercase letters, numbers, and hyphens');
            updateConfig({ slug });
            return;
        }
        
        setSlugError('');
        updateConfig({ slug });
    };

    const checkSlugAvailability = async (slug: string) => {
        if (!slug) return;
        
        setIsCheckingSlug(true);
        try {
            const isAvailable = await isAppSlugAvailable(
                slug, 
                config.id // Pass current ID for edit mode
            );
            
            if (!isAvailable) {
                setSlugError('This slug is already in use');
            }
        } catch (error) {
            console.error('Error checking slug availability:', error);
        } finally {
            setIsCheckingSlug(false);
        }
    };
    
    const isValidSlug = (slug: string): boolean => {
        const slugRegex = /^[a-z0-9-]+$/;
        return slugRegex.test(slug);
    };

    const handleImageSelected = (imageUrl: string) => {
        if (imageUrl && imageUrl !== config.imageUrl) {
            updateConfig({ imageUrl });
        }
    };
    
    const handleImageRemoved = () => {
        updateConfig({ imageUrl: "" });
    };
    
    const handleIconSelect = (iconType: string, iconName: string) => {
        if (iconType === 'mainAppIcon') {
            updateConfig({ mainAppIcon: iconName });
        } else if (iconType === 'mainAppSubmitIcon') {
            updateConfig({ mainAppSubmitIcon: iconName });
        }
    };
    
    const handleColorChange = (colorType: string, color: string) => {
        if (colorType === 'primary') {
            updateConfig({ primaryColor: color });
        } else if (colorType === 'accent') {
            updateConfig({ accentColor: color });
        }
    };
    
    const handleLayoutChange = (layoutType: string) => {
        updateConfig({ layoutType });
    };

    return (
        <div className="w-full">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-6">
                {/* Header */}
                <div className="bg-gray-100 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-rose-500 font-medium text-lg">Primary App Information</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Please provide information about your app. This can be updated later.
                    </p>
                </div>

                {/* Content */}
                <div className="flex flex-col md:flex-row">
                    {/* Form */}
                    <div className="w-full md:w-2/3 p-5 max-h-[750px] overflow-y-auto">
                        <div className="space-y-4">
                            {/* App Name & Slug (combined row) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        App Name
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Enter app name"
                                        value={config.name || ""}
                                        onChange={handleNameChange}
                                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="slug" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        App URL Slug
                                    </Label>
                                    <Input
                                        id="slug"
                                        name="slug"
                                        placeholder="Enter unique app slug"
                                        value={config.slug || ""}
                                        onChange={handleSlugChange}
                                        onBlur={() => checkSlugAvailability(config.slug || "")}
                                        className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${
                                            slugError ? 'border-red-500 dark:border-red-500' : ''
                                        }`}
                                    />
                                    {slugError && (
                                        <p className="text-red-500 text-xs mt-1">{slugError}</p>
                                    )}
                                    {isCheckingSlug && (
                                        <p className="text-blue-500 text-xs mt-1">Checking availability...</p>
                                    )}
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Enter app description"
                                    value={config.description || ""}
                                    onChange={handleInputChange}
                                    rows={3}
                                    className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                />
                            </div>
                            
                            {/* Icons & Colors row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        App Icon
                                    </Label>
                                    <div className="flex justify-center">
                                        <IconPicker
                                            selectedIcon={config.mainAppIcon}
                                            onIconSelect={(iconName) => handleIconSelect('mainAppIcon', iconName)}
                                            dialogTitle="Select App Icon"
                                            dialogDescription="Choose an icon to represent your app"
                                            className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                            primaryColor={config.primaryColor}
                                            accentColor={config.accentColor}
                                            iconType="appIcon"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Submit Icon
                                    </Label>
                                    <div className="flex justify-center">
                                        <IconPicker
                                            selectedIcon={config.mainAppSubmitIcon}
                                            onIconSelect={(iconName) => handleIconSelect('mainAppSubmitIcon', iconName)}
                                            dialogTitle="Select Submit Icon"
                                            dialogDescription="Choose an icon for the submit action"
                                            className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                            primaryColor={config.primaryColor}
                                            accentColor={config.accentColor}
                                            iconType="submitIcon"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Primary Color
                                    </Label>
                                    <TailwindColorPicker
                                        selectedColor={config.primaryColor || "gray"}
                                        onColorChange={(color) => handleColorChange('primary', color)}
                                        size="sm"
                                        className="w-full"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Accent Color
                                    </Label>
                                    <TailwindColorPicker
                                        selectedColor={config.accentColor || "rose"}
                                        onColorChange={(color) => handleColorChange('accent', color)}
                                        size="sm" 
                                        className="w-full"
                                    />
                                </div>
                            </div>
                            
                            {/* Layout and App Banner in a single row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="layoutType" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        App Layout
                                    </Label>
                                    <Select
                                        value={config.layoutType || "oneColumn"}
                                        onValueChange={handleLayoutChange}
                                    >
                                        <SelectTrigger className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                            <SelectValue placeholder="Select a layout" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {appletLayoutOptionsArray.map(layout => (
                                                <SelectItem key={layout.value} value={layout.value} className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-700 dark:text-gray-300">{layout.icon}</span>
                                                        <span>{layout.title}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label htmlFor="creator" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Creator Name
                                    </Label>
                                    <Input
                                        id="creator"
                                        name="creator"
                                        placeholder="Enter your name"
                                        value={config.creator || ""}
                                        onChange={handleInputChange}
                                        className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                    />
                                </div>
                            </div>
                            
                            {/* App Banner Image */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    App Banner Image
                                </Label>
                                <div className="w-full">
                                    <SingleImageSelect 
                                        size="md"
                                        aspectRatio="landscape"
                                        placeholder="Select App Banner"
                                        onImageSelected={handleImageSelected}
                                        onImageRemoved={handleImageRemoved}
                                        initialTab="public-search"
                                        initialSearchTerm={config.name}
                                        preselectedImageUrl={config.imageUrl}
                                        className="w-full max-w-full"
                                        instanceId="app-banner"
                                        saveTo="public"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="p-5 md:w-1/3 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <h3 className="text-gray-900 dark:text-gray-100 font-medium mb-4">Live Preview</h3>
                        <AppPreviewCard app={config} className="max-w-lg mx-auto mb-6" />
                        
                        <div className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">App Information</h4>
                            <div className="grid grid-cols-1 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{config.name || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Slug:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{config.slug || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Creator:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{config.creator || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Layout:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {appletLayoutOptionsArray.find(l => l.value === config.layoutType)?.title || 'Standard'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Colors:</span>
                                    <span className="flex items-center">
                                        <span className={`inline-block w-3 h-3 rounded-full bg-${config.primaryColor || 'gray'}-500 mr-1`}></span>
                                        <span className={`inline-block w-3 h-3 rounded-full bg-${config.accentColor || 'rose'}-500 ml-1`}></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Save Button in Preview Section */}
                        <Button 
                            onClick={saveApp}
                            disabled={!config.name || !config.slug || !!slugError}
                            className="w-full mt-4 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                        >
                            {isEdit ? 'Update App Info' : 'Save App Info'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AppInfoStep;
