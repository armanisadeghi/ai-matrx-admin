"use client";

import React, { useEffect } from "react";
import { PlusIcon, XIcon, LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TailwindColorPicker } from "@/components/ui/TailwindColorPicker";
import { IconPicker } from "@/components/ui/IconPicker";
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";
import { RootState } from "@/lib/redux/store";
import {
    startNewApplet,
    setName,
    setSlug,
    setDescription,
    setCreator,
    setAppletIcon,
    setAppletSubmitText,
    setPrimaryColor,
    setAccentColor,
    setLayoutType,
    setImageUrl,
} from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { createAppletThunk, deleteAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import { fetchAppletsForAppThunk } from "@/lib/redux/app-builder/thunks/appBuilderThunks";
import {
    selectAppletById,
    selectAppletName,
    selectAppletSlug,
    selectAppletDescription,
    selectAppletCreator,
    selectAppletIcon,
    selectAppletSubmitText,
    selectAppletPrimaryColor,
    selectAppletAccentColor,
    selectAppletLayoutType,
    selectAppletImageUrl,
    selectAppletLoading,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { useToast } from "@/components/ui/use-toast";
import { AppletSlugChecker } from "@/features/applet/builder/components/smart-parts/applets/AppletSlugChecker";
import { useAppDispatch, useAppSelector } from "@/lib/redux";

// Default values for new applets
export const DEFAULT_APPLET_CONFIG = {
    name: "",
    description: "",
    slug: "",
    appletIcon: "Settings",
    appletSubmitText: "",
    creator: "",
    primaryColor: "emerald",
    accentColor: "blue",
    layoutType: "default",
    containers: [],
    imageUrl: "",
};

export interface AppletFormProps {
    appletId?: string; // Existing applet ID or undefined for new applet
    appId?: string; // Optional app ID for the applet
    onAppletAdded?: (appletId: string) => void; // Callback when applet is added/saved
    onAppletRemoved?: () => void; // Callback when applet is removed
    isNew?: boolean; // Flag to indicate if this is a new applet form
}

export const AppletFormComponent: React.FC<AppletFormProps> = ({ appletId, appId, onAppletAdded, onAppletRemoved, isNew = false }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();

    // If this is a new applet and no appletId is provided, create a new one
    useEffect(() => {
        if (isNew && !appletId) {
            dispatch(startNewApplet({ ...DEFAULT_APPLET_CONFIG, appId }));
        }
    }, [dispatch, isNew, appletId, appId]);

    // Redux selectors for the current applet (new or existing)
    const applet = useAppSelector((state: RootState) => selectAppletById(state, appletId || ""));
    const appletName = useAppSelector((state: RootState) => selectAppletName(state, appletId || ""));
    const appletSlug = useAppSelector((state: RootState) => selectAppletSlug(state, appletId || ""));
    const appletDescription = useAppSelector((state: RootState) => selectAppletDescription(state, appletId || ""));
    const appletCreator = useAppSelector((state: RootState) => selectAppletCreator(state, appletId || ""));
    const appletIcon = useAppSelector((state: RootState) => selectAppletIcon(state, appletId || ""));
    const appletSubmitText = useAppSelector((state: RootState) => selectAppletSubmitText(state, appletId || ""));
    const appletPrimaryColor = useAppSelector((state: RootState) => selectAppletPrimaryColor(state, appletId || ""));
    const appletAccentColor = useAppSelector((state: RootState) => selectAppletAccentColor(state, appletId || ""));
    const appletLayoutType = useAppSelector((state: RootState) => selectAppletLayoutType(state, appletId || ""));
    const appletImageUrl = useAppSelector((state: RootState) => selectAppletImageUrl(state, appletId || ""));
    const appletLoading = useAppSelector(selectAppletLoading);

    const handleAddApplet = () => {
        if (applet && appletName && appletSlug) {
            dispatch(createAppletThunk(applet))
                .then((result) => {
                    // Access the created applet ID from the result
                    const createdAppletId =
                        result.payload && typeof result.payload === "object" && "id" in result.payload
                            ? (result.payload.id as string)
                            : undefined;
                    if (onAppletAdded && createdAppletId) {
                        onAppletAdded(createdAppletId);
                    }

                    toast({
                        title: "Success",
                        description: "Applet created successfully.",
                    });
                })
                .catch((error) => {
                    toast({
                        title: "Error",
                        description: "Failed to create applet.",
                        variant: "destructive",
                    });
                });
        }
    };

    const handleRemoveApplet = () => {
        if (appletId) {
            dispatch(deleteAppletThunk(appletId))
                .then(() => {
                    if (onAppletRemoved) {
                        onAppletRemoved();
                    }

                    toast({
                        title: "Success",
                        description: "Applet removed successfully.",
                    });
                })
                .catch((error) => {
                    toast({
                        title: "Error",
                        description: "Failed to remove applet.",
                        variant: "destructive",
                    });
                });
        }
    };

    const handleImageSelected = (imageUrl: string) => {
        if (appletId) {
            dispatch(setImageUrl({ id: appletId, imageUrl }));
        }
    };

    const handleImageRemoved = () => {
        if (appletId) {
            dispatch(setImageUrl({ id: appletId, imageUrl: "" }));
        }
    };

    const handleAppletChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        if (appletId) {
            if (name === "name") {
                dispatch(setName({ id: appletId, name: value }));
                // Auto-generate slug from name if this is a new applet
                if (isNew) {
                    const slug = generateSlug(value);
                    dispatch(setSlug({ id: appletId, slug }));
                }
            } else if (name === "slug") {
                dispatch(setSlug({ id: appletId, slug: value }));
            } else if (name === "description") {
                dispatch(setDescription({ id: appletId, description: value }));
            } else if (name === "creator") {
                dispatch(setCreator({ id: appletId, creator: value }));
            }
        }
    };

    const generateSlug = (name: string): string => {
        return name
            .toLowerCase()
            .replace(/([a-z])([A-Z])/g, "$1-$2") // Convert camelCase to kebab
            .replace(/\s+/g, "-") // Replace spaces with hyphens
            .replace(/[^a-z0-9-]/g, ""); // Remove special characters
    };

    const getAppletUrl = (appName: string = "", slug: string = ""): string => {
        const appNameSlug = generateSlug(appName);
        return `aimatrx.com/applets/${appNameSlug}/${slug}`;
    };

    const handleAppletIconSelect = (iconName: string) => {
        if (appletId) {
            dispatch(setAppletIcon({ id: appletId, appletIcon: iconName }));
        }
    };

    const handleAppletColorChange = (colorType: "primary" | "accent", color: string) => {
        if (appletId) {
            if (colorType === "primary") {
                dispatch(setPrimaryColor({ id: appletId, primaryColor: color }));
            } else {
                dispatch(setAccentColor({ id: appletId, accentColor: color }));
            }
        }
    };

    const handleLayoutChange = (layout: string) => {
        if (appletId) {
            dispatch(setLayoutType({ id: appletId, layoutType: layout }));
        }
    };

    const handleAppletSubmitTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (appletId) {
            dispatch(setAppletSubmitText({ id: appletId, appletSubmitText: value }));
        }
    };

    return (
        <div className="space-y-5">
            <h3 className="text-gray-900 dark:text-gray-100 font-medium">{isNew ? "Add New Applet" : `Edit Applet: ${appletName}`}</h3>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Form section */}
                <div className="w-full md:w-2/3 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor={`${isNew ? "new" : "edit"}-name`} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Applet Name
                        </Label>
                        <Input
                            id={`${isNew ? "new" : "edit"}-name`}
                            name="name"
                            value={appletName || ""}
                            onChange={handleAppletChange}
                            placeholder="Enter applet name"
                            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label
                            htmlFor={`${isNew ? "new" : "edit"}-creator`}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100"
                        >
                            Creator Name
                        </Label>
                        <Input
                            id={`${isNew ? "new" : "edit"}-creator`}
                            name="creator"
                            value={appletCreator || ""}
                            onChange={handleAppletChange}
                            placeholder="Enter creator name"
                            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${isNew ? "new" : "edit"}-slug`} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Applet Slug
                        </Label>
                        <div className="relative">
                            <Input
                                id={`${isNew ? "new" : "edit"}-slug`}
                                name="slug"
                                value={appletSlug || ""}
                                onChange={handleAppletChange}
                                placeholder="Enter applet slug"
                                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 pr-10"
                            />
                            <AppletSlugChecker appletId={appletId} slug={appletSlug || ""} />
                        </div>
                        {appletSlug && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                <LinkIcon size={12} className="mr-1" />
                                {getAppletUrl("", appletSlug)}
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <Label
                            htmlFor={`${isNew ? "new" : "edit"}-description`}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100"
                        >
                            Description
                        </Label>
                        <Textarea
                            id={`${isNew ? "new" : "edit"}-description`}
                            name="description"
                            value={appletDescription || ""}
                            onChange={handleAppletChange}
                            placeholder="Enter applet description"
                            rows={5}
                            className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                    </div>
                    {/* Submit Button row */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Submit Button</Label>
                        <div className="flex items-center gap-2">
                            <IconPicker
                                selectedIcon={appletIcon || DEFAULT_APPLET_CONFIG.appletIcon}
                                onIconSelect={handleAppletIconSelect}
                                dialogTitle="Select Submit Button"
                                dialogDescription="Choose an icon to represent your submit button"
                                className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg"
                                primaryColor={appletPrimaryColor || DEFAULT_APPLET_CONFIG.primaryColor}
                                accentColor={appletAccentColor || DEFAULT_APPLET_CONFIG.accentColor}
                                iconType="submitIcon"
                            />
                            <Input
                                id={`${isNew ? "new" : "edit"}-submit-text`}
                                value={appletSubmitText || DEFAULT_APPLET_CONFIG.appletSubmitText}
                                onChange={handleAppletSubmitTextChange}
                                className="flex-1 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                                placeholder="Optional button text"
                            />
                        </div>
                    </div>
                </div>

                {/* Image section */}
                <div className="w-full md:w-1/3 space-y-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Applet Image</Label>
                        <SingleImageSelect
                            size="sm"
                            aspectRatio="landscape"
                            placeholder="Select Applet Image"
                            onImageSelected={handleImageSelected}
                            onImageRemoved={handleImageRemoved}
                            initialTab="public-search"
                            initialSearchTerm={appletName}
                            preselectedImageUrl={appletImageUrl}
                            className="w-full"
                            instanceId={`applet-image-${appletId}`}
                            saveTo="public"
                        />
                        <div className="flex items-center gap-6 pt-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Primary Color</Label>
                                <TailwindColorPicker
                                    selectedColor={appletPrimaryColor || DEFAULT_APPLET_CONFIG.primaryColor}
                                    onColorChange={(color) => handleAppletColorChange("primary", color)}
                                    size="sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Accent Color</Label>
                                <TailwindColorPicker
                                    selectedColor={appletAccentColor || DEFAULT_APPLET_CONFIG.accentColor}
                                    onColorChange={(color) => handleAppletColorChange("accent", color)}
                                    size="sm"
                                />
                            </div>
                        </div>
                    </div>
                    {isNew ? (
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full mt-2 bg-rose-500 hover:bg-rose-600 text-white"
                            onClick={handleAddApplet}
                            disabled={!appletName || !appletSlug || appletLoading}
                        >
                            <PlusIcon size={16} className="mr-2" />
                            Add Applet
                        </Button>
                    ) : (
                        <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <Button
                                variant="default"
                                size="sm"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                                onClick={() => {
                                    if (applet && appletId) {
                                        dispatch(createAppletThunk(applet))
                                            .then(() => {
                                                toast({
                                                    title: "Success",
                                                    description: "Applet updated successfully.",
                                                });
                                                
                                                // Refresh applets if appId is available
                                                if (appId) {
                                                    dispatch(fetchAppletsForAppThunk(appId));
                                                }
                                            })
                                            .catch((error) => {
                                                toast({
                                                    title: "Error",
                                                    description: "Failed to update applet.",
                                                    variant: "destructive",
                                                });
                                            });
                                    }
                                }}
                                disabled={appletLoading}
                            >
                                Save Changes
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleRemoveApplet}
                                className="w-full"
                                disabled={appletLoading}
                            >
                                <XIcon size={16} className="mr-2" />
                                Remove Applet
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppletFormComponent;
