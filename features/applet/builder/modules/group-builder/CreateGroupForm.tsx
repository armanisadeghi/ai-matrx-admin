'use client';

import React from 'react';
import { PlusIcon, SaveIcon, CheckIcon, RefreshCwIcon, FileTextIcon, TrashIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComponentGroup } from '@/features/applet/builder/builder.types';

interface CreateGroupFormProps {
  newGroup: Partial<ComponentGroup>;
  selectedGroup: ComponentGroup | null;
  loading: boolean;
  handleLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  resetForm: () => void;
  saveGroup: () => Promise<void>;
  updateGroup: () => Promise<void>;
  openRefreshDialog: (groupId: string) => void;
  setShowAddFieldsDialog: (show: boolean) => void;
  removeFieldFromGroupUI: (groupId: string, fieldId: string) => Promise<void>;
}

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({
  newGroup,
  selectedGroup,
  loading,
  handleLabelChange,
  handleInputChange,
  handleSelectChange,
  resetForm,
  saveGroup,
  updateGroup,
  openRefreshDialog,
  setShowAddFieldsDialog,
  removeFieldFromGroupUI,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="label" className="text-gray-900 dark:text-gray-100">
                Group Label
              </Label>
              <Input
                id="label"
                name="label"
                value={newGroup.label || ''}
                onChange={handleLabelChange}
                placeholder="Enter group label"
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="shortLabel" className="text-gray-900 dark:text-gray-100">
                Short Label (Optional)
              </Label>
              <Input
                id="shortLabel"
                name="shortLabel"
                value={newGroup.shortLabel || ''}
                onChange={handleInputChange}
                placeholder="Maximum 12 characters"
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                maxLength={12}
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-900 dark:text-gray-100">
              Description
            </Label>
            <Textarea
              id="description"
              name="description"
              value={newGroup.description || ''}
              onChange={handleInputChange}
              placeholder="Enter group description"
              className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              rows={2}
              disabled={loading}
            />
            <div className="flex items-center mt-1">
              <input
                type="checkbox"
                id="hideDescription"
                checked={newGroup.hideDescription || false}
                onChange={() => handleSelectChange('hideDescription', newGroup.hideDescription ? 'false' : 'true')}
                className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label htmlFor="hideDescription" className="ml-2 block text-sm text-gray-500 dark:text-gray-400">
                Hide description (Useful if the layout you choose looks busy with a description or if one is not needed for your use case)
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="helpText" className="text-gray-900 dark:text-gray-100">
              Help Text
            </Label>
            <Textarea
              id="helpText"
              name="helpText"
              value={newGroup.helpText || ''}
              onChange={handleInputChange}
              placeholder="Enter help text for this group"
              className="resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              rows={2}
              disabled={loading}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="isPublic" className="text-gray-900 dark:text-gray-100">
                Public Group
              </Label>
              <Select
                value={newGroup.isPublic ? 'true' : 'false'}
                onValueChange={(value) => handleSelectChange('isPublic', value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes (Public)</SelectItem>
                  <SelectItem value="false">No (Private)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="authenticatedRead" className="text-gray-900 dark:text-gray-100">
                Authenticated Users Can Read
              </Label>
              <Select
                value={newGroup.authenticatedRead ? 'true' : 'false'}
                onValueChange={(value) => handleSelectChange('authenticatedRead', value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="publicRead" className="text-gray-900 dark:text-gray-100">
                Public Users Can Read
              </Label>
              <Select
                value={newGroup.publicRead ? 'true' : 'false'}
                onValueChange={(value) => handleSelectChange('publicRead', value)}
                disabled={loading}
              >
                <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-gray-900 dark:text-gray-100">
              Fields ({newGroup.fields?.length || 0})
            </Label>
            <div className="flex space-x-2">
              {selectedGroup && newGroup.fields && newGroup.fields.length > 0 && (
                <Button
                  onClick={() => openRefreshDialog(selectedGroup.id)}
                  className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white"
                  disabled={loading}
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Refresh Fields
                </Button>
              )}
              <Button
                onClick={() => setShowAddFieldsDialog(true)}
                className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
                disabled={loading}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Fields
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500 dark:border-amber-400"></div>
            </div>
          ) : (!newGroup.fields || newGroup.fields.length === 0) ? (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 text-center">
              <FileTextIcon className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-600 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No fields added yet</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAddFieldsDialog(true)}
                className="mt-4 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              >
                Add Fields
              </Button>
            </div>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Field List
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {newGroup.fields?.map((field, index) => (
                  <li key={field.id || index} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-10 rounded-sm bg-amber-500 dark:bg-amber-600 mt-1`}></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {field.label}
                          {field.required && 
                            <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                              Required
                            </span>
                          }
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
                            {field.component}
                          </span>
                          {field.placeholder && 
                            <span className="ml-2 italic">
                              Placeholder: "{field.placeholder}"
                            </span>
                          }
                        </p>
                        {field.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                            {field.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-400 dark:text-gray-500 mr-2 hidden sm:block">
                        ID: {field.id?.substring(0, 8)}...
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => selectedGroup 
                          ? removeFieldFromGroupUI(selectedGroup.id, field.id) 
                          : handleSelectChange('fields', JSON.stringify(
                              newGroup.fields?.filter((_, i) => i !== index) || []
                            ))}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        disabled={loading}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 pt-4">
        <Button
          variant="outline"
          onClick={resetForm}
          className="border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
          disabled={loading}
        >
          Reset
        </Button>
        
        <Button
          onClick={selectedGroup ? updateGroup : saveGroup}
          className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white"
          disabled={loading || !newGroup.label || !newGroup.id}
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
              {selectedGroup ? 'Updating...' : 'Saving...'}
            </div>
          ) : selectedGroup ? (
            <><CheckIcon className="h-4 w-4 mr-2" /> Update Group</>
          ) : (
            <><SaveIcon className="h-4 w-4 mr-2" /> Save Group</>
          )}
        </Button>
      </div>
    </div>
  );
}; 