"use client";

import React, { useEffect, useState } from "react";
import { PlusIcon, XIcon, LinkIcon, SaveIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TailwindColorPicker } from "@/components/ui/TailwindColorPicker";
import { IconPicker } from "@/components/ui/IconPicker";
import { SingleImageSelect } from "@/components/image/shared/SingleImageSelect";
import { RootState } from "@/lib/redux/store";
import {
    setName,
    setSlug,
    setDescription,
    setCreator,
    setAppletIcon,
    setAppletSubmitText,
    setPrimaryColor,
    setAccentColor,
    setImageUrl,
    setAppId,
    setCompiledRecipeId,
    setActiveApplet,
} from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { deleteAppletThunk, saveAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
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
    selectAppletImageUrl,
    selectAppletLoading,
    selectHasUnsavedAppletChanges,
    selectAppletAppId,
    selectAppletCompiledRecipeId,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { useToast } from "@/components/ui/use-toast";
import { AppletSlugChecker } from "@/features/applet/builder/modules/smart-parts/applets/AppletSlugChecker";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogFooter,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { AppletBuilder } from "@/lib/redux/app-builder/types";
import { AppletLayoutSelection } from "@/features/applet/builder/parts/AppletLayoutSelection";
import { RecipeSelector } from "@/features/applet/builder/modules/smart-parts/applets";
import { convertToKebabCase } from "@/utils/text/stringUtils";
import { AppletSourceConfig } from "@/lib/redux/app-builder/service/customAppletService";
import { setTempAppletSourceConfig } from "@/lib/redux/app-builder/slices/appletBuilderSlice";

// Default values for new applets
export const DEFAULT_APPLET_CONFIG: AppletBuilder = {
    id: "",
    name: "",
    description: "",
    slug: "",
    appletIcon: "Search",
    appletSubmitText: "",
    creator: "",
    primaryColor: "gray",
    accentColor: "blue",
    layoutType: "open",
    containers: [],
    imageUrl: "",
};

export interface AppletFormProps {
    appletId?: string; // Existing applet ID
    appId?: string; // Optional app ID for the applet
    isNew?: boolean; // Flag to indicate if this is a new applet form
    onSaveApplet?: () => void; // Callback for saving the applet
    onRemoveApplet?: () => void; // Callback for removing the applet
}

export const AppletFormComponent: React.FC<AppletFormProps> = ({ appletId, appId, isNew = false, onSaveApplet, onRemoveApplet }) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Redux selectors for the current applet
    const applet = useAppSelector((state: RootState) => selectAppletById(state, appletId || ""));
    const appletName = useAppSelector((state: RootState) => selectAppletName(state, appletId || ""));
    const appletSlug = useAppSelector((state: RootState) => selectAppletSlug(state, appletId || ""));
    const appletDescription = useAppSelector((state: RootState) => selectAppletDescription(state, appletId || ""));
    const appletCreator = useAppSelector((state: RootState) => selectAppletCreator(state, appletId || ""));
    const appletIcon = useAppSelector((state: RootState) => selectAppletIcon(state, appletId || ""));
    const appletSubmitText = useAppSelector((state: RootState) => selectAppletSubmitText(state, appletId || ""));
    const appletPrimaryColor = useAppSelector((state: RootState) => selectAppletPrimaryColor(state, appletId || ""));
    const appletAccentColor = useAppSelector((state: RootState) => selectAppletAccentColor(state, appletId || ""));
    const appletImageUrl = useAppSelector((state: RootState) => selectAppletImageUrl(state, appletId || ""));
    const appletCompiledRecipeId = useAppSelector((state: RootState) => selectAppletCompiledRecipeId(state, appletId || ""));
    const appletLoading = useAppSelector(selectAppletLoading);
    const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppletChanges);
    const appletAppId = useAppSelector((state: RootState) => selectAppletAppId(state, appletId || ""));

    const [sourceConfig, setSourceConfig] = useState<AppletSourceConfig | null>(null);

    const isAssociated = appletAppId === appId;

    const handleRecipeSelected = (compiledRecipeId: string) => {
        if (appletId) {
            dispatch(setCompiledRecipeId({ id: appletId, compiledRecipeId }));
        }
    };

    const handleDeleteApplet = () => {
        if (appletId) {
            dispatch(deleteAppletThunk(appletId))
                .unwrap()
                .then(() => {
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

    const handleRemoveFromApp = () => {
        if (appletId) {
            dispatch(setAppId({ id: appletId, appId: "" }));
            dispatch(saveAppletThunk(appletId));
            dispatch(setActiveApplet(null));
            onRemoveApplet?.();
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

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (appletId) {
            dispatch(setName({ id: appletId, name: value }));
        }
    };

    const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (appletId && isNew && !appletSlug) {
            const slug = convertToKebabCase(e.target.value);
            dispatch(setSlug({ id: appletId, slug }));
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (appletId) {
            dispatch(setSlug({ id: appletId, slug: value }));
        }
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (appletId) {
            dispatch(setDescription({ id: appletId, description: value }));
        }
    };

    const handleCreatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (appletId) {
            dispatch(setCreator({ id: appletId, creator: value }));
        }
    };

    const getAppletUrl = (appName: string = "", slug: string = ""): string => {
        if (!slug) return "";
        return `aimatrx.com/applets/${slug}`;
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

    const handleAppletSubmitTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (appletId) {
            dispatch(setAppletSubmitText({ id: appletId, appletSubmitText: value }));
        }
    };

    const handleGetCompiledRecipeWithNeededBrokers = (sourceConfig: AppletSourceConfig | null) => {
        if (sourceConfig) {
            dispatch(setTempAppletSourceConfig(sourceConfig));
        }
    };

    // Ensure we have a valid applet before rendering
    if (!appletId) {
        return <div className="p-4 text-gray-500 dark:text-gray-400">No applet selected</div>;
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col md:flex-row gap-6">
                {/* Form section */}
                <div className="w-full space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor={`${isNew ? "new" : "edit"}-name`} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Applet Name
                        </Label>
                        <Input
                            id={`${isNew ? "new" : "edit"}-name`}
                            name="name"
                            value={appletName || ""}
                            onChange={handleNameChange}
                            onBlur={handleNameBlur}
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
                            onChange={handleCreatorChange}
                            placeholder="Enter creator name"
                            className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${isNew ? "new" : "edit"}-slug`} className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Slug URL
                        </Label>
                        <div className="relative">
                            <Input
                                id={`${isNew ? "new" : "edit"}-slug`}
                                name="slug"
                                value={appletSlug || ""}
                                onChange={handleSlugChange}
                                placeholder="Enter URL slug"
                                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500 pr-10"
                            />
                            <AppletSlugChecker appletId={appletId} slug={appletSlug || ""} />
                        </div>
                        {appletSlug && (
                            <div className="flex items-center mt-1 space-x-1 text-xs text-gray-500 dark:text-gray-400">
                                <LinkIcon className="w-3 h-3" />
                                <span>{getAppletUrl(appletName, appletSlug)}</span>
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
                            onChange={handleDescriptionChange}
                            placeholder="Enter applet description"
                            rows={5}
                            className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-rose-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Submit Button</Label>
                        <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex items-center gap-2 w-full md:w-auto">
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
                            <div className="flex items-center gap-4 w-full md:w-auto justify-start">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Primary</Label>
                                    <TailwindColorPicker
                                        selectedColor={appletPrimaryColor || DEFAULT_APPLET_CONFIG.primaryColor}
                                        onColorChange={(color) => handleAppletColorChange("primary", color)}
                                        size="sm"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">Accent</Label>
                                    <TailwindColorPicker
                                        selectedColor={appletAccentColor || DEFAULT_APPLET_CONFIG.accentColor}
                                        onColorChange={(color) => handleAppletColorChange("accent", color)}
                                        size="sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="w-full md:w-1/2 space-y-2">
                            <AppletLayoutSelection appletId={appletId} label="Layout Type" />
                        </div>
                        <div className="w-full md:w-1/2 space-y-2">
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
                        </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        {!isNew && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={appletLoading}
                            >
                                <XIcon className="w-4 h-4 mr-1" />
                                Delete Applet
                            </Button>
                        )}
                        {isAssociated && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-yellow-500 text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-950"
                                onClick={() => handleRemoveFromApp()}
                                disabled={appletLoading}
                            >
                                <XIcon className="w-4 h-4 mr-1" />
                                Remove From App
                            </Button>
                        )}
                        {hasUnsavedChanges && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                onClick={onSaveApplet}
                                disabled={appletLoading}
                            >
                                <SaveIcon className="w-4 h-4 mr-1" />
                                Save
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to delete this applet?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the applet and remove it from any apps that use it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteApplet} className="bg-red-500 text-white hover:bg-red-600">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AppletFormComponent;

