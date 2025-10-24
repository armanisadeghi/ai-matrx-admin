"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppDispatch } from "@/lib/redux";
import { startNewApp } from "@/lib/redux/app-builder/slices/appBuilderSlice";
import { v4 as uuidv4 } from "uuid";

interface ComplexTemplateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAppCreated: (appId: string) => void;
}

const ComplexTemplateDialog: React.FC<ComplexTemplateDialogProps> = ({
  isOpen,
  onClose,
  onAppCreated,
}) => {
  const dispatch = useAppDispatch();

  const handleCreateFromTemplate = () => {
    const newAppId = uuidv4();
    dispatch(
      startNewApp({
        id: newAppId,
        template: {
          type: "complex",
          appName: "Complex App",
          description: "A complex app with multiple applets, containers, and fields",
        },
      })
    );
    onAppCreated(newAppId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-textured">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Create Complex App Template
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 text-gray-700 dark:text-gray-300">
          <p>
            This will create a new app with the following structure:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>One App</li>
            <li>Multiple Applets (3)</li>
            <li>Multiple Containers per Applet</li>
            <li>Various Field Types</li>
            <li>Sample Relations between Applets</li>
          </ul>
          <p className="mt-4">
            This complex template demonstrates a more realistic application
            structure with multiple interconnected components and various field types.
          </p>
          <p className="mt-4 text-amber-600 dark:text-amber-400 font-medium">
            Note: Full template functionality will be implemented soon. Currently this creates a basic app with placeholder elements.
          </p>
        </div>
        <DialogFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            onClick={handleCreateFromTemplate}
          >
            Create Complex App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ComplexTemplateDialog; 