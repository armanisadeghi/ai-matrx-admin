"use client";

import React from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface UnsavedChangesAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewChanges: () => void;
  onContinue: () => void;
  unsavedItemsCount: number;
}

export function UnsavedChangesAlert({
  open,
  onOpenChange,
  onViewChanges,
  onContinue,
  unsavedItemsCount
}: UnsavedChangesAlertProps) {
  // Handle dialog close attempts
  const handleOpenChange = (isOpen: boolean) => {
    // Allow the dialog to close through the onOpenChange handler
    onOpenChange(isOpen);
  };
  
  // Handle view changes button click
  const handleViewChanges = () => {
    onViewChanges();
  };
  
  // Handle continue button click
  const handleContinue = () => {
    onContinue();
  };
  
  return (
    <AlertDialog 
      open={open} 
      onOpenChange={handleOpenChange}
    >
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-amber-600 dark:text-amber-500">
            Unsaved Changes
          </AlertDialogTitle>
          <AlertDialogDescription>
            {unsavedItemsCount === 1 ? (
              <span>
                You have 1 app with unsaved changes. Would you like to view it before navigating away?
              </span>
            ) : (
              <span>
                You have {unsavedItemsCount} apps with unsaved changes. Would you like to view them before navigating away?
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex items-center justify-end space-x-2">
          <AlertDialogCancel 
            className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            onClick={handleContinue}
          >
            Continue Without Saving
          </AlertDialogCancel>
          <AlertDialogAction 
            className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-800/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            onClick={handleViewChanges}
          >
            View Unsaved Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 