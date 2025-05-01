"use client";

import React from "react";
import { CheckIcon, AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComponentGroup } from "@/features/applet/builder/builder.types";

interface RefreshFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refreshOption: "all" | "selected";
  setRefreshOption: (option: "all" | "selected") => void;
  groupToRefresh: string | null;
  savedGroups: ComponentGroup[];
  fieldsToRefresh: string[];
  toggleFieldRefresh: (fieldId: string) => void;
  handleRefreshFields: () => Promise<void>;
  loading: boolean;
}

export const RefreshFieldsDialog: React.FC<RefreshFieldsDialogProps> = ({
  open,
  onOpenChange,
  refreshOption,
  setRefreshOption,
  groupToRefresh,
  savedGroups,
  fieldsToRefresh,
  toggleFieldRefresh,
  handleRefreshFields,
  loading
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Refresh Fields</DialogTitle>
          <DialogDescription>
            Choose which fields to refresh with their latest definitions. This will update fields in the group to match
            their latest saved versions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="refresh-option" className="text-gray-900 dark:text-gray-100">
              Refresh Option
            </Label>
            <Select value={refreshOption} onValueChange={(value) => setRefreshOption(value as "all" | "selected")}>
              <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <SelectValue placeholder="Select refresh option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="selected">Selected Fields</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {refreshOption === "selected" && groupToRefresh && (
            <div className="space-y-2">
              <Label className="text-gray-900 dark:text-gray-100">Select Fields to Refresh</Label>
              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {savedGroups
                    .find((group) => group.id === groupToRefresh)
                    ?.fields.map((field) => (
                      <li 
                        key={field.id} 
                        className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          fieldsToRefresh.includes(field.id) ? "bg-amber-50 dark:bg-amber-900/20" : ""
                        }`}
                        onClick={() => toggleFieldRefresh(field.id)}
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {field.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {field.id}</p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded border ${
                            fieldsToRefresh.includes(field.id) 
                              ? "bg-amber-500 border-amber-500 dark:bg-amber-600 dark:border-amber-600 flex items-center justify-center"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {fieldsToRefresh.includes(field.id) && <CheckIcon className="h-3 w-3 text-white" />}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex">
              <AlertCircleIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Important</h3>
                <div className="mt-1 text-sm text-amber-700 dark:text-amber-400">
                  <p>
                    Refreshing fields will update them with their latest definitions. Any custom configurations made
                    directly to fields in this group might be overwritten.
                  </p>
                </div>
              </div>
            </div>
          </div>
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
            onClick={handleRefreshFields}
            disabled={(refreshOption === "selected" && fieldsToRefresh.length === 0) || loading}
            className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
          >
            {loading ? "Refreshing..." : "Refresh Fields"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 