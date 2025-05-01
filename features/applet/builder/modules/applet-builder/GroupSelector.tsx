'use client';

import React from 'react';
import { PlusIcon, CheckIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SavedGroup } from '../group-builder/GroupBuilder';

interface GroupSelectorProps {
  showAddGroupsDialog: boolean;
  setShowAddGroupsDialog: (show: boolean) => void;
  availableGroups: SavedGroup[];
  selectedGroups: string[];
  toggleGroupSelection: (groupId: string) => void;
  addSelectedGroupsToApplet: () => void;
}

export const GroupSelector: React.FC<GroupSelectorProps> = ({
  showAddGroupsDialog,
  setShowAddGroupsDialog,
  availableGroups,
  selectedGroups,
  toggleGroupSelection,
  addSelectedGroupsToApplet
}) => {
  return (
    <Dialog open={showAddGroupsDialog} onOpenChange={setShowAddGroupsDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Groups</DialogTitle>
          <DialogDescription>
            Select groups to add to this applet
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {availableGroups.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">No groups available</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create groups in the Group Builder first
              </p>
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {availableGroups.map(group => (
                  <li 
                    key={group.id}
                    className={`px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedGroups.includes(group.id) ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                    }`}
                    onClick={() => toggleGroupSelection(group.id)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.label}</p>
                      {(group.description || group.helpText) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                          {group.description || group.helpText}
                        </p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full ${
                      selectedGroups.includes(group.id) 
                        ? 'bg-emerald-500 border-emerald-500 dark:bg-emerald-600 dark:border-emerald-600 flex items-center justify-center' 
                        : 'border border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedGroups.includes(group.id) && (
                        <CheckIcon className="h-3 w-3 text-white" />
                      )}
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
            onClick={() => setShowAddGroupsDialog(false)}
            className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          >
            Cancel
          </Button>
          <Button
            onClick={addSelectedGroupsToApplet}
            disabled={selectedGroups.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Selected Groups ({selectedGroups.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GroupSelector; 