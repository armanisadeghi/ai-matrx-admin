"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handleDeleteGroup: () => Promise<void>;
  loading: boolean;
  title?: string;
  description?: string;
  deleteButtonText?: string;
  hasSecondStep?: boolean;
  secondStepTitle?: string;
  secondStepDescription?: string;
  secondStepButtonText?: string;
  onSecondStepConfirm?: () => Promise<void>;
  secondStepCancelText?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  open,
  onOpenChange,
  handleDeleteGroup,
  loading,
  title = "Are you sure?",
  description = "This action cannot be undone. This will permanently delete the item and remove it from the system.",
  deleteButtonText = "Delete",
  hasSecondStep = false,
  secondStepTitle,
  secondStepDescription,
  secondStepButtonText = "Delete and Save",
  onSecondStepConfirm,
  secondStepCancelText
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFirstAction = async () => {
    setIsProcessing(true);
    try {
      await handleDeleteGroup();
      onOpenChange(false);
    } catch (error) {
      console.error("Error during delete operation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSecondAction = async () => {
    setIsProcessing(true);
    try {
      // First perform the delete action
      await handleDeleteGroup();
      
      // Then perform the second action if provided
      if (onSecondStepConfirm) {
        await onSecondStepConfirm();
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error during combined operation:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleCancel}>
      <AlertDialogContent className="w-full max-w-lg p-4 sm:p-6 bg-slate-100 dark:bg-slate-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="pb-2">{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col items-center gap-3 mt-4 w-full">
          <AlertDialogCancel
            disabled={isProcessing}
            className=" bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 w-full"
          >
            Cancel
          </AlertDialogCancel>
          
          {/* Primary action button */}
          <AlertDialogAction
            onClick={handleFirstAction}
            disabled={isProcessing}
            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white w-full"
          >
            {isProcessing ? "Processing..." : deleteButtonText}
          </AlertDialogAction>
          
          {/* Secondary action button - only shown if hasSecondStep is true */}
          {hasSecondStep && onSecondStepConfirm && (
            <AlertDialogAction
              onClick={handleSecondAction}
              disabled={isProcessing}
              className="bg-red-700 hover:bg-red-800 dark:bg-red-800 dark:hover:bg-red-900 text-white font-bold border-2 border-red-900 dark:border-red-500 flex items-center justify-center gap-1 w-full"
            >
              <AlertTriangle className="h-5 w-5 mr-2 text-bold text-yellow-500" />
              <span className="text-sm">{isProcessing ? "Processing..." : secondStepButtonText}</span>
            </AlertDialogAction>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}; 