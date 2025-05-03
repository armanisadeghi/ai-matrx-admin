'use client';

import React from "react";
import { useAppDispatch, useAppSelector } from '@/lib/redux';
import { CustomAppConfig } from "@/features/applet/builder/builder.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { TailwindColorPicker } from '@/components/ui/TailwindColorPicker';
import AppPreviewCard from "@/features/applet/builder/previews/AppPreviewCard";
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";
import { IconPicker } from '@/components/ui/IconPicker';
import { CheckCircle } from 'lucide-react';
import { createAppThunk, updateAppThunk } from '@/lib/redux/app-builder/thunks/appBuilderThunks';
import { updateApp } from '@/lib/redux/app-builder/slices/appBuilderSlice';
import { selectAppLoading, selectAppError, selectAppSlugStatus, selectAppIsDirty } from '@/lib/redux/app-builder/selectors/appSelectors';
import { convertToKebabCase } from '@/utils/text/stringUtils';
import { checkAppSlugUniqueness } from '@/lib/redux/app-builder/thunks/appBuilderThunks';
import { AppLayoutSelection } from '@/features/applet/builder/parts/AppLayoutSelection';
import { AppSlugChecker } from '@/features/applet/builder/components/smart-parts/apps/AppSlugChecker';

interface AppConfigStepProps {
    config: Partial<CustomAppConfig>;
    updateConfig: (updates: Partial<CustomAppConfig>) => void;
    saveApp: (appId: string) => void;
    isEdit: boolean;
}

export const AppConfigStep: React.FC<AppConfigStepProps> = ({ 
    config, 
    updateConfig,
    saveApp,
    isEdit 
}) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();
    
    // Redux state
    const appLoading = useAppSelector(selectAppLoading);
    const appError = useAppSelector(selectAppError);
    const slugStatus = useAppSelector(state => config.id ? selectAppSlugStatus(state, config.id) : 'unchecked');
    const isDirty = useAppSelector(state => config.id ? selectAppIsDirty(state, config.id) : true);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // If we have an ID, update through Redux
        if (config.id) {
            dispatch(updateApp({ 
                id: config.id, 
                changes: { [name]: value } 
            }));
        } else {
            // Otherwise, update local state through parent component
            updateConfig({ [name]: value });
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        const slug = convertToKebabCase(name);
        
        if (config.id) {
            dispatch(updateApp({ 
                id: config.id, 
                changes: { name, slug } 
            }));
        } else {
            updateConfig({ name, slug });
        }
    };
    
    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawSlug = e.target.value;
        // Convert to kebab case to ensure proper formatting
        const slug = convertToKebabCase(rawSlug);
        
        if (config.id) {
            dispatch(updateApp({ 
                id: config.id, 
                changes: { slug } 
            }));
        } else {
            updateConfig({ slug });
        }
    };
    
    const handleImageSelected = (imageUrl: string) => {
        if (imageUrl && imageUrl !== config.imageUrl) {
            if (config.id) {
                dispatch(updateApp({ 
                    id: config.id, 
                    changes: { imageUrl } 
                }));
            } else {
                updateConfig({ imageUrl });
            }
        }
    };
    
    const handleImageRemoved = () => {
        if (config.id) {
            dispatch(updateApp({ 
                id: config.id, 
                changes: { imageUrl: "" } 
            }));
        } else {
            updateConfig({ imageUrl: "" });
        }
    };
    
    const handleIconSelect = (iconType: string, iconName: string) => {
        if (iconType === 'mainAppIcon') {
            if (config.id) {
                dispatch(updateApp({ 
                    id: config.id, 
                    changes: { mainAppIcon: iconName } 
                }));
            } else {
                updateConfig({ mainAppIcon: iconName });
            }
        } else if (iconType === 'mainAppSubmitIcon') {
            if (config.id) {
                dispatch(updateApp({ 
                    id: config.id, 
                    changes: { mainAppSubmitIcon: iconName } 
                }));
            } else {
                updateConfig({ mainAppSubmitIcon: iconName });
            }
        }
    };
    
    const handleColorChange = (colorType: string, color: string) => {
        if (colorType === 'primary') {
            if (config.id) {
                dispatch(updateApp({ 
                    id: config.id, 
                    changes: { primaryColor: color } 
                }));
            } else {
                updateConfig({ primaryColor: color });
            }
        } else if (colorType === 'accent') {
            if (config.id) {
                dispatch(updateApp({ 
                    id: config.id, 
                    changes: { accentColor: color } 
                }));
            } else {
                updateConfig({ accentColor: color });
            }
        }
    };
    
    const handleSaveApp = async () => {
        if (!config.name || !config.slug) {
            toast({
                title: "Required Fields Missing",
                description: "App name and slug are required.",
                variant: "destructive",
            });
            return;
        }
        
        // For new apps, check slug uniqueness before saving
        if (!isEdit) {
            try {
                // Check if the slug is available
                const checkResult = await dispatch(checkAppSlugUniqueness({
                    slug: config.slug,
                    appId: config.id
                })).unwrap();
                
                if (!checkResult) {
                    toast({
                        title: "Slug Already In Use",
                        description: "This slug is already in use. Please choose a different one.",
                        variant: "destructive",
                    });
                    return;
                }
            } catch (error) {
                console.error('Error checking slug uniqueness:', error);
                toast({
                    title: "Error",
                    description: "Failed to check slug availability. Please try again.",
                    variant: "destructive",
                });
                return;
            }
        } else if (slugStatus === 'notUnique') {
            // For existing apps, check the current slugStatus
            toast({
                title: "Slug Already In Use",
                description: "This slug is already in use. Please choose a different one.",
                variant: "destructive",
            });
            return;
        }
        
        try {
            let savedAppId: string;
            
            if (isEdit && config.id) {
                // Update existing app
                const updatedApp = await dispatch(updateAppThunk({
                    id: config.id,
                    changes: config as Partial<CustomAppConfig>
                })).unwrap();
                
                savedAppId = updatedApp.id;
                
                toast({
                    title: "App Updated",
                    description: "Your changes have been saved.",
                });
            } else {
                // Create new app
                const newApp = await dispatch(createAppThunk({
                    ...config,
                    id: '',
                    appletIds: []
                } as any)).unwrap();
                
                savedAppId = newApp.id;
                
                toast({
                    title: "App Created",
                    description: "Your app has been created successfully.",
                });
            }
            
            // Call the parent's saveApp function with the app ID
            saveApp(savedAppId);
        } catch (error) {
            console.error('Error saving app:', error);
            toast({
                title: "Error",
                description: "Failed to save app. Please try again.",
                variant: "destructive",
            });
        }
    };
    
    // Helper to render required field indicator
    const Required = () => (
        <span className="text-red-500 ml-1">*</span>
    );

    // Render the save/update button based on dirty state
    const renderSaveButton = () => {
        // For new apps (not yet saved) or dirty apps
        if (!isEdit || isDirty) {
            return (
                <Button 
                    onClick={handleSaveApp}
                    disabled={appLoading || slugStatus === 'notUnique' || !config.name || !config.slug}
                    className="w-full mt-4 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                >
                    {appLoading ? 'Saving...' : isEdit ? 'Update App Info' : 'Save App Info'}
                </Button>
            );
        }
        
        // For saved apps with no changes (not dirty)
        return (
            <Button 
                disabled
                className="w-full mt-4 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 flex items-center justify-center gap-2 cursor-default"
            >
                <CheckCircle className="h-4 w-4" />
                App Saved
            </Button>
        );
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
                                        App Name<Required />
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
                                        App URL Slug<Required />
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="slug"
                                            name="slug"
                                            placeholder="Enter unique app slug"
                                            value={config.slug || ""}
                                            onChange={handleSlugChange}
                                            className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${
                                                slugStatus === 'notUnique' ? 'border-red-500 dark:border-red-500' : ''
                                            } pr-10`}
                                        />
                                        <AppSlugChecker appId={config.id} slug={config.slug || ""} />
                                    </div>
                                    {slugStatus === 'notUnique' && (
                                        <p className="text-red-500 text-xs mt-1">This slug is already in use</p>
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
                            
                            {/* Layout Type & Creator Name row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Replace Select with AppLayoutSelection component */}
                                {config.id ? (
                                    <AppLayoutSelection appId={config.id} label="App Layout" />
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            App Layout
                                        </Label>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 p-2 rounded-md">
                                            Save app to select a layout
                                        </div>
                                    </div>
                                )}
                                
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
                        <AppPreviewCard app={config} className="max-w-lg mx-auto mb-6" />
                        
                        <div className={`p-4 bg-${config.primaryColor} rounded-lg border border-gray-200 dark:border-gray-600`}>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">App Information</h4>
                            <div className="grid grid-cols-1 gap-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{config.name || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Slug:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">matrx.com/apps/{config.slug || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Creator:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{config.creator || 'Not set'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Layout:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                        {config.layoutType ? config.layoutType.charAt(0).toUpperCase() + config.layoutType.slice(1) : 'Not set'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Colors:</span>
                                    <span className="flex items-center">
                                        <span className={`inline-block w-6 h-6 rounded-none bg-${config.primaryColor || 'gray'}-500 mr-1`}></span>
                                        <span className={`inline-block w-3 h-3 rounded-full bg-${config.accentColor || 'rose'}-500 ml-1`}></span>
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Save Button in Preview Section */}
                        {renderSaveButton()}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AppConfigStep;
