"use client";

import React from "react";
import { LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { RootState } from "@/lib/redux/store";
import {
    setName,
    setSlug,
    setDescription,
    setCreator,
} from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import {
    selectAppletName,
    selectAppletSlug,
    selectAppletDescription,
    selectAppletCreator,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { AppletSlugChecker } from "@/features/applet/builder/modules/smart-parts/applets/AppletSlugChecker";
import { convertToKebabCase } from "@/utils/text/stringUtils";

export interface AppletOverviewProps {
    appletId: string;
    isNew?: boolean;
}

export const AppletOverview: React.FC<AppletOverviewProps> = ({ appletId, isNew = false }) => {
    const dispatch = useAppDispatch();

    // Redux selectors for the current applet
    const appletName = useAppSelector((state: RootState) => selectAppletName(state, appletId));
    const appletSlug = useAppSelector((state: RootState) => selectAppletSlug(state, appletId));
    const appletDescription = useAppSelector((state: RootState) => selectAppletDescription(state, appletId));
    const appletCreator = useAppSelector((state: RootState) => selectAppletCreator(state, appletId));

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        dispatch(setName({ id: appletId, name: value }));
    };

    const handleNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (isNew && !appletSlug) {
            const slug = convertToKebabCase(e.target.value);
            dispatch(setSlug({ id: appletId, slug }));
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        dispatch(setSlug({ id: appletId, slug: value }));
    };

    const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        dispatch(setDescription({ id: appletId, description: value }));
    };

    const handleCreatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        dispatch(setCreator({ id: appletId, creator: value }));
    };

    const getAppletUrl = (slug: string = ""): string => {
        if (!slug) return "";
        return `aimatrx.com/applets/${slug}`;
    };

    return (
        <div className="space-y-4">
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
                        <span>{getAppletUrl(appletSlug)}</span>
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
        </div>
    );
};

export default AppletOverview; 