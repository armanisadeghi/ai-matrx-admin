"use client";

import React from "react";
import { CheckIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldDefinition } from "../../builder.types";


interface AddFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableFields: FieldDefinition[];
  selectedFields: string[];
  toggleFieldSelection: (fieldId: string) => void;
  addSelectedFieldsToGroup: () => Promise<void>;
  loading: boolean;
}

export const AddFieldsDialog: React.FC<AddFieldsDialogProps> = ({
  open,
  onOpenChange,
  availableFields,
  selectedFields,
  toggleFieldSelection,
  addSelectedFieldsToGroup,
  loading
}) => {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Fields to Group</DialogTitle>
          <DialogDescription>Select fields to add to your group</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {availableFields.length === 0 ? (
            <div className="text-center py-8">
              <FileTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No fields available</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create fields first in the Field Builder</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {availableFields.map((field) => (
                  <li 
                    key={field.id} 
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedFields.includes(field.id) ? "bg-amber-50 dark:bg-amber-900/20" : ""
                    }`}
                    onClick={() => toggleFieldSelection(field.id)}
                  >
                    <div className="flex items-center">
                      <div
                        className={`w-5 h-5 rounded border ${
                          selectedFields.includes(field.id) 
                            ? "bg-amber-500 border-amber-500 dark:bg-amber-600 dark:border-amber-600 flex items-center justify-center"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {selectedFields.includes(field.id) && <CheckIcon className="h-3 w-3 text-white" />}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{field.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Type: {field.component} {field.required && <span className="text-red-500 dark:text-red-400">• Required</span>}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      ID: {field.id.substring(0, 8)}...
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={addSelectedFieldsToGroup}
            disabled={selectedFields.length === 0 || loading}
            className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
          >
            {loading ? "Adding..." : `Add Selected (${selectedFields.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 