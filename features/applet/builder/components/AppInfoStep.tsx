'use client';

import React from "react";
import { AppConfig } from "../ConfigBuilder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import AppPreviewCard from "@/features/applet/builder/previews/AppPreviewCard";
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";

interface AppInfoStepProps {
    config: Partial<AppConfig>;
    updateConfig: (updates: Partial<AppConfig>) => void;
}

export const AppInfoStep: React.FC<AppInfoStepProps> = ({ config, updateConfig }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        updateConfig({ [name]: value });
    };

    const handleImageSelected = (imageUrl: string) => {
        if (imageUrl && imageUrl !== config.imageUrl) {
            updateConfig({ imageUrl });
        }
    };
    
    const handleImageRemoved = () => {
        updateConfig({ imageUrl: "" });
    };

    return (
        <div className="w-full">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden mb-6">
                {/* Header Section with lighter background */}
                <div className="bg-gray-100 dark:bg-gray-700 p-4 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-rose-500 font-medium text-lg">Primary App Information</h2>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">
                        Please provide some information about your core app. This information can easily be updated later.
                    </p>
                </div>

                {/* Split Layout for Form and Preview */}
                <div className="flex flex-col md:flex-row">
                    {/* Form Section */}
                    <div className="p-6 flex-1">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    App Name
                                </Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="Enter app name"
                                    value={config.name || ""}
                                    onChange={handleChange}
                                    className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="creatorName" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Creator Name
                                </Label>
                                <Input
                                    id="creatorName"
                                    name="creatorName"
                                    placeholder="Enter your name"
                                    value={config.creatorName || ""}
                                    onChange={handleChange}
                                    className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="id" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    App ID
                                </Label>
                                <Input
                                    id="id"
                                    name="id"
                                    placeholder="Enter unique app ID"
                                    value={config.id || ""}
                                    onChange={handleChange}
                                    className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    A unique identifier for your app. Use lowercase letters, numbers, and hyphens.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    Description
                                </Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="Enter app description"
                                    value={config.description || ""}
                                    onChange={handleChange}
                                    rows={4}
                                    className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    A brief description of your app and what it does.
                                </p>
                            </div>
                            
                            {/* Image Selection */}
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
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Upload an image for your app banner. This will be displayed on the app card.
                                    Recommended size: 1200 × 630 pixels.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preview Section */}
                    <div className="p-6 md:w-1/3 flex-shrink-0 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <AppPreviewCard app={config} className="max-w-lg mx-auto" />
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default AppInfoStep;
