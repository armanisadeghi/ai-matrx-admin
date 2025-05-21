"use client";

import React, { useState } from "react";
import { XIcon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/redux";
import { RootState } from "@/lib/redux/store";
import {
    setAppId,
    setActiveApplet,
} from "@/lib/redux/app-builder/slices/appletBuilderSlice";
import { deleteAppletThunk, saveAppletThunk } from "@/lib/redux/app-builder/thunks/appletBuilderThunks";
import {
    selectAppletLoading,
    selectHasUnsavedAppletChanges,
    selectAppletAppId,
} from "@/lib/redux/app-builder/selectors/appletSelectors";
import { useToast } from "@/components/ui/use-toast";
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

export interface AppletActionsProps {
    appletId: string;
    appId?: string;
    isNew?: boolean;
    onSaveApplet?: () => void;
    onRemoveApplet?: () => void;
}

export const AppletActions: React.FC<AppletActionsProps> = ({ 
    appletId, 
    appId, 
    isNew = false, 
    onSaveApplet, 
    onRemoveApplet
}) => {
    const dispatch = useAppDispatch();
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const appletLoading = useAppSelector(selectAppletLoading);
    const hasUnsavedChanges = useAppSelector(selectHasUnsavedAppletChanges);
    const appletAppId = useAppSelector((state: RootState) => selectAppletAppId(state, appletId));

    const isAssociated = appletAppId === appId;

    const handleDeleteApplet = () => {
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
    };

    const handleRemoveFromApp = () => {
        dispatch(setAppId({ id: appletId, appId: "" }));
        dispatch(saveAppletThunk(appletId));
        dispatch(setActiveApplet(null));
        onRemoveApplet?.();
    };

    return (
        <div>
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

export default AppletActions; 