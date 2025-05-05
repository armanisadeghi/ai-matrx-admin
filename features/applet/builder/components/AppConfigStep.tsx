"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { CustomAppConfig } from "@/features/applet/builder/builder.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { TailwindColorPicker } from "@/components/ui/TailwindColorPicker";
import AppPreviewCard from "@/features/applet/builder/previews/AppPreviewCard";
import AppInfoCard from "@/features/applet/builder/previews/AppInfoCard";
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";
import { IconPicker } from "@/components/ui/IconPicker";
import { CheckCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/spinner";

// Redux imports
import { saveAppThunk, checkAppSlugUniqueness } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import {
    setName,
    setDescription,
    setSlug,
    setMainAppIcon,
    setMainAppSubmitIcon,
    setCreator,
    setPrimaryColor,
    setAccentColor,
    setImageUrl,
} from "@/lib/redux/app-builder/slices/appBuilderSlice";
import {
    selectAppLoading,
    selectAppError,
    selectAppSlugStatus,
    selectAppIsDirty,
    selectAppName,
    selectAppDescription,
    selectAppSlug,
    selectAppMainAppIcon,
    selectAppMainAppSubmitIcon,
    selectAppCreator,
    selectAppPrimaryColor,
    selectAppAccentColor,
    selectAppLayoutType,
    selectAppImageUrl,
    selectAppIsLocal,
} from "@/lib/redux/app-builder/selectors/appSelectors";
import { convertToKebabCase } from "@/utils/text/stringUtils";
import { AppLayoutSelection } from "@/features/applet/builder/parts/AppLayoutSelection";
import { AppSlugChecker } from "@/features/applet/builder/components/smart-parts/apps/AppSlugChecker";

interface AppConfigStepProps {
    appId: string;
    onAppSaved: (appId: string) => void;
}

export const AppConfigStep: React.FC<AppConfigStepProps> = ({ appId, onAppSaved }) => {
    const { toast } = useToast();
    const dispatch = useAppDispatch();


    // Redux state selectors
    const appLoading = useAppSelector(selectAppLoading);
    const appError = useAppSelector(selectAppError);
    const slugStatus = useAppSelector((state) => selectAppSlugStatus(state, appId));
    const isDirty = useAppSelector((state) => selectAppIsDirty(state, appId));
    const isLocal = useAppSelector((state) => selectAppIsLocal(state, appId));

    // App field selectors
    const name = useAppSelector((state) => selectAppName(state, appId));
    const description = useAppSelector((state) => selectAppDescription(state, appId));
    const slug = useAppSelector((state) => selectAppSlug(state, appId));
    const mainAppIcon = useAppSelector((state) => selectAppMainAppIcon(state, appId));
    const mainAppSubmitIcon = useAppSelector((state) => selectAppMainAppSubmitIcon(state, appId));
    const creator = useAppSelector((state) => selectAppCreator(state, appId));
    const primaryColor = useAppSelector((state) => selectAppPrimaryColor(state, appId));
    const accentColor = useAppSelector((state) => selectAppAccentColor(state, appId));
    const layoutType = useAppSelector((state) => selectAppLayoutType(state, appId));
    const imageUrl = useAppSelector((state) => selectAppImageUrl(state, appId));

    // Individual handlers for each field
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        dispatch(setName({ id: appId, name: newName }));

        // Auto-generate slug from name if field is empty or hasn't been manually edited
        if (!slug || slug === convertToKebabCase(name)) {
            const newSlug = convertToKebabCase(newName);
            dispatch(setSlug({ id: appId, slug: newSlug }));
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawSlug = e.target.value;
        const newSlug = convertToKebabCase(rawSlug);
        dispatch(setSlug({ id: appId, slug: newSlug }));
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        dispatch(setDescription({ id: appId, description: e.target.value }));
    };

    const handleCreatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setCreator({ id: appId, creator: e.target.value }));
    };

    const handleMainIconSelect = (iconName: string) => {
        dispatch(setMainAppIcon({ id: appId, mainAppIcon: iconName }));
    };

    const handleSubmitIconSelect = (iconName: string) => {
        dispatch(setMainAppSubmitIcon({ id: appId, mainAppSubmitIcon: iconName }));
    };

    const handlePrimaryColorChange = (color: string) => {
        dispatch(setPrimaryColor({ id: appId, primaryColor: color }));
    };

    const handleAccentColorChange = (color: string) => {
        dispatch(setAccentColor({ id: appId, accentColor: color }));
    };

    const handleImageSelected = (imageUrl: string) => {
        dispatch(setImageUrl({ id: appId, imageUrl }));
    };

    const handleImageRemoved = () => {
        dispatch(setImageUrl({ id: appId, imageUrl: "" }));
    };

    const checkSlugUniqueness = async () => {
        if (slugStatus === "unchecked" && slug) {
            try {
                await dispatch(
                    checkAppSlugUniqueness({
                        slug,
                        appId,
                    })
                ).unwrap();
            } catch (error) {
                console.error("Error checking slug uniqueness:", error);
                toast({
                    title: "Error",
                    description: "Failed to check slug availability. Please try again.",
                    variant: "destructive",
                });
            }
        }
    };

    // Check slug uniqueness when slug changes
    useEffect(() => {
        if (slug && slugStatus === "unchecked") {
            const timer = setTimeout(() => {
                checkSlugUniqueness();
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [slug, slugStatus]);

    const handleSaveApp = async () => {
        if (!name || !slug) {
            toast({
                title: "Required Fields Missing",
                description: "App name and slug are required.",
                variant: "destructive",
            });
            return;
        }

        // Handle slug status check
        if (slugStatus === "unchecked") {
            try {
                const checkResult = await dispatch(
                    checkAppSlugUniqueness({
                        slug,
                        appId,
                    })
                ).unwrap();

                if (!checkResult) {
                    toast({
                        title: "Slug Already In Use",
                        description: "This slug is already in use. Please choose a different one.",
                        variant: "destructive",
                    });
                    return;
                }
            } catch (error) {
                console.error("Error checking slug uniqueness:", error);
                toast({
                    title: "Error",
                    description: "Failed to check slug availability. Please try again.",
                    variant: "destructive",
                });
                return;
            }
        } else if (slugStatus === "notUnique") {
            toast({
                title: "Slug Already In Use",
                description: "This slug is already in use. Please choose a different one.",
                variant: "destructive",
            });
            return;
        }

        try {
            // Save app using the unified save thunk
            const savedApp = await dispatch(saveAppThunk(appId)).unwrap();

            toast({
                title: isLocal ? "App Created" : "App Updated",
                description: isLocal ? "Your app has been created successfully." : "Your changes have been saved.",
            });

            // Call the parent's callback with the app ID
            onAppSaved(savedApp.id);
        } catch (error) {
            console.error("Error saving app:", error);
            toast({
                title: "Error",
                description: "Failed to save app. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Helper to render required field indicator
    const Required = () => <span className="text-red-500 ml-1">*</span>;

    // Render the save/update button based on dirty state
    const renderSaveButton = () => {
        // For new apps (not yet saved) or dirty apps
        if (isLocal || isDirty) {
            return (
                <Button
                    onClick={handleSaveApp}
                    disabled={appLoading || slugStatus === "notUnique" || !name || !slug}
                    className="w-full mt-4 bg-rose-500 hover:bg-rose-600 text-white dark:bg-rose-600 dark:hover:bg-rose-700"
                >
                    {appLoading ? "Saving..." : isLocal ? "Save App Info" : "Update App Info"}
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
            {/* Add loading state check here */}
            {!appId ? (
                <div className="flex flex-col items-center justify-center h-96">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading app configuration...</p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">Debug: appId is missing or invalid</p>
                </div>
            ) : (
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
                                            <Required />
                                        </Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Enter app name"
                                            value={name || ""}
                                            onChange={handleNameChange}
                                            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="slug" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            App URL Slug
                                            <Required />
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="slug"
                                                name="slug"
                                                placeholder="Enter unique app slug"
                                                value={slug || ""}
                                                onChange={handleSlugChange}
                                                className={`border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 ${
                                                    slugStatus === "notUnique" ? "border-red-500 dark:border-red-500" : ""
                                                } pr-10`}
                                                onBlur={checkSlugUniqueness}
                                            />
                                            <AppSlugChecker appId={appId} slug={slug} />
                                        </div>
                                        {slugStatus === "notUnique" && (
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
                                        value={description || ""}
                                        onChange={handleDescriptionChange}
                                        rows={3}
                                        className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                    />
                                </div>

                                {/* Icons & Colors row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">App Icon</Label>
                                        <div className="flex justify-center">
                                            <IconPicker
                                                selectedIcon={mainAppIcon}
                                                onIconSelect={handleMainIconSelect}
                                                dialogTitle="Select App Icon"
                                                dialogDescription="Choose an icon to represent your app"
                                                className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                                primaryColor={primaryColor}
                                                accentColor={accentColor}
                                                iconType="appIcon"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Submit Icon</Label>
                                        <div className="flex justify-center">
                                            <IconPicker
                                                selectedIcon={mainAppSubmitIcon}
                                                onIconSelect={handleSubmitIconSelect}
                                                dialogTitle="Select Submit Icon"
                                                dialogDescription="Choose an icon for the submit action"
                                                className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                                primaryColor={primaryColor}
                                                accentColor={accentColor}
                                                iconType="submitIcon"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Primary Color</Label>
                                        <TailwindColorPicker
                                            selectedColor={primaryColor || "gray"}
                                            onColorChange={handlePrimaryColorChange}
                                            size="sm"
                                            className="w-full"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Accent Color</Label>
                                        <TailwindColorPicker
                                            selectedColor={accentColor || "rose"}
                                            onColorChange={handleAccentColorChange}
                                            size="sm"
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {/* Layout Type & Creator Name row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Only show AppLayoutSelection when app is not local */}
                                    <AppLayoutSelection appId={appId} label="App Layout" />

                                    <div className="space-y-2">
                                        <Label htmlFor="creator" className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                            Creator Name
                                        </Label>
                                        <Input
                                            id="creator"
                                            name="creator"
                                            placeholder="Enter your name"
                                            value={creator || ""}
                                            onChange={handleCreatorChange}
                                            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                        />
                                    </div>
                                </div>

                                {/* App Banner Image */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">App Banner Image</Label>
                                    <div className="w-full">
                                        <SingleImageSelect
                                            size="md"
                                            aspectRatio="landscape"
                                            placeholder="Select App Banner"
                                            onImageSelected={handleImageSelected}
                                            onImageRemoved={handleImageRemoved}
                                            initialTab="public-search"
                                            initialSearchTerm={name}
                                            preselectedImageUrl={imageUrl}
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
                            <AppPreviewCard appId={appId} className="max-w-lg mx-auto mb-6" />

                            {/* App Info Card */}
                            <AppInfoCard appId={appId} />

                            {/* Save Button in Preview Section */}
                            {renderSaveButton()}
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default AppConfigStep;
