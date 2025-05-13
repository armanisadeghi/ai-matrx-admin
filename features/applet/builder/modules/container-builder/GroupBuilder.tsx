"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { AppletContainersConfig } from "@/features/applet/a-old-depricated-do-not-use/runner-depreciated-do-not-use/components/field-components/types";
import { ComponentGroup, FieldDefinition } from "@/types/customAppTypes";
import {
    createComponentGroup,
    deleteComponentGroup,
    updateComponentGroup,
    addOrRefreshFieldInGroup,
    refreshAllFieldsInGroup,
    addFieldToGroup,
    removeFieldFromGroup,
    getComponentGroupById,
    getAllFieldComponents,
    getAllComponentGroups
} from "@/lib/redux/app-builder/service";
import { CreateGroupForm } from "./CreateGroupForm";
import { SavedGroupsList } from "./SavedGroupsList";
import { AddFieldsDialog } from "./AddFieldsDialog";
import { RefreshFieldsDialog } from "./RefreshFieldsDialog";
import { ConfirmationDialog } from "../../parts/ConfirmationDialog";

// Helper function to generate ID
const generateGroupId = (label: string) => {
    return label.toLowerCase().replace(/\s+/g, "-");
};

export interface SavedGroup extends AppletContainersConfig {
    id: string;
    createdAt?: string;
    lastModified?: string;
    shortLabel?: string;
    isPublic?: boolean;
    authenticatedRead?: boolean;
    publicRead?: boolean;
    hideDescription?: boolean;
    helpText?: string;
}

export const GroupBuilder = () => {
    const { toast } = useToast();
    const [newGroup, setNewGroup] = useState<Partial<ComponentGroup>>({
        id: "",
        label: "",
        shortLabel: "",
        description: "",
        helpText: "",
        fields: [],
        isPublic: false,
        authenticatedRead: true,
        publicRead: false,
        hideDescription: false,
    });
    const [savedGroups, setSavedGroups] = useState<ComponentGroup[]>([]);
    const [activeTab, setActiveTab] = useState<string>("create");
    const [selectedGroup, setSelectedGroup] = useState<ComponentGroup | null>(null);
    const [showAddFieldsDialog, setShowAddFieldsDialog] = useState(false);
    const [availableFields, setAvailableFields] = useState<FieldDefinition[]>([]);
    const [selectedFields, setSelectedFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [showRefreshDialog, setShowRefreshDialog] = useState(false);
    const [groupToRefresh, setGroupToRefresh] = useState<string | null>(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
    const [refreshOption, setRefreshOption] = useState<"all" | "selected">("all");
    const [fieldsToRefresh, setFieldsToRefresh] = useState<string[]>([]);

    // Load saved groups from database and fields from fieldComponentService
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Fetch all available fields directly from the database first
                const fields = await getAllFieldComponents();
                console.log("AVAILABLE FIELDS:", fields);
                
                setAvailableFields(fields);
                
                // Load groups from database
                const groups = await getAllComponentGroups();
                console.log("FETCHED GROUPS:", groups);
                
                // Check if groups have fields data; if not, we'll need to handle it
                const processedGroups = groups.map(group => {
                    // If the group has fields that are just IDs or incomplete objects,
                    // populate the complete field data from our available fields
                    if (group.fields && Array.isArray(group.fields)) {
                        // If fields are just IDs or incomplete, replace with complete field data
                        const completeFields = group.fields.map(field => {
                            const fieldId = typeof field === 'string' ? field : field.id;
                            // Find complete field data from available fields
                            const completeField = fields.find(f => f.id === fieldId);
                            return completeField || field; // Fallback to original if not found
                        }).filter(Boolean);
                        
                        return {
                            ...group,
                            fields: completeFields
                        };
                    }
                    return group;
                });
                
                console.log("PROCESSED GROUPS:", processedGroups);
                
                setSavedGroups(processedGroups);
            } catch (error) {
                console.error("Failed to load data:", error);
                toast({
                    title: "Error Loading Data",
                    description: "Failed to load your saved groups or fields. Please try again.",
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setNewGroup((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const label = e.target.value;
        setNewGroup((prev) => ({
            ...prev,
            label,
            id: prev.id || generateGroupId(label),
        }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setNewGroup((prev) => ({
            ...prev,
            [name]: value === "true" ? true : value === "false" ? false : value,
        }));
    };

    const resetForm = () => {
        setNewGroup({
            id: "",
            label: "",
            shortLabel: "",
            description: "",
            helpText: "",
            fields: [],
            isPublic: false,
            authenticatedRead: true,
            publicRead: false,
            hideDescription: false,
        });
        setSelectedGroup(null);
        setSelectedFields([]);
    };

    const saveGroup = async () => {
        if (!newGroup.id || !newGroup.label) {
            toast({
                title: "Validation Error",
                description: "Group ID and label are required",
                variant: "destructive",
            });
            return;
        }

        setLoading(true);
        try {
            // Map selected fields to field definitions
            const selectedFieldObjects = availableFields.filter((field) =>
                selectedFields.includes(field.id)
            ) as unknown as FieldDefinition[];

            // Create the new group with the database service
            const savedGroup = await createComponentGroup({
                ...(newGroup as ComponentGroup),
                fields: selectedFieldObjects,
            });

            // Update local state
            setSavedGroups((prev) => [...prev, savedGroup]);

            toast({
                title: "Group Created",
                description: `Group "${newGroup.label}" has been saved successfully.`,
            });

            resetForm();
        } catch (error) {
            console.error("Error saving group:", error);
            toast({
                title: "Error",
                description: "Failed to save the group. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const editGroup = (group: ComponentGroup) => {
        setSelectedGroup(group);
        setNewGroup({
            id: group.id,
            label: group.label,
            shortLabel: group.shortLabel,
            description: group.description,
            helpText: group.helpText,
            fields: group.fields,
            isPublic: group.isPublic,
            authenticatedRead: group.authenticatedRead,
            publicRead: group.publicRead,
            hideDescription: group.hideDescription,
        });

        // Set already selected fields
        const fieldIds = group.fields.map((field) => field.id);
        setSelectedFields(fieldIds);

        setActiveTab("create");
    };

    const updateGroup = async () => {
        if (!selectedGroup || !newGroup.id) return;

        setLoading(true);
        try {
            // Update the group in the database
            const updatedGroup = await updateComponentGroup(selectedGroup.id, newGroup as ComponentGroup);

            // Update local state
            setSavedGroups((prev) => prev.map((group) => (group.id === selectedGroup.id ? updatedGroup : group)));

            toast({
                title: "Group Updated",
                description: `Group "${newGroup.label}" has been updated successfully.`,
            });

            resetForm();
        } catch (error) {
            console.error("Error updating group:", error);
            toast({
                title: "Error",
                description: "Failed to update the group. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteGroup = (id: string) => {
        setGroupToDelete(id);
        setShowDeleteDialog(true);
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;

        setLoading(true);
        try {
            // Delete from database
            await deleteComponentGroup(groupToDelete);

            // Update local state
            setSavedGroups((prev) => prev.filter((group) => group.id !== groupToDelete));

            toast({
                title: "Group Deleted",
                description: "Group has been deleted successfully.",
            });
        } catch (error) {
            console.error("Error deleting group:", error);
            toast({
                title: "Error",
                description: "Failed to delete the group. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setShowDeleteDialog(false);
            setGroupToDelete(null);
        }
    };

    const toggleFieldSelection = (fieldId: string) => {
        setSelectedFields((prev) => (prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]));
    };

    const addSelectedFieldsToGroup = async () => {
        if (selectedFields.length === 0) {
            setShowAddFieldsDialog(false);
            return;
        }

        if (!selectedGroup) {
            // If no group is selected, we're just adding fields to the form
            // Get the complete field definitions from availableFields
            const fieldsToAdd = availableFields.filter((field) => 
                selectedFields.includes(field.id)
            );

            setNewGroup((prev) => ({
                ...prev,
                fields: [...(prev.fields || []), ...fieldsToAdd],
            }));

            setShowAddFieldsDialog(false);
            setSelectedFields([]);

            toast({
                title: "Fields Added",
                description: `${fieldsToAdd.length} fields added to the group.`,
            });
            return;
        }

        // For existing groups, use the service to add fields
        setLoading(true);
        try {
            // Add each selected field to the group
            for (const fieldId of selectedFields) {
                await addFieldToGroup(selectedGroup.id, fieldId);
            }

            // Fetch all fields again to ensure we have the latest data
            const fields = await getAllFieldComponents();
            setAvailableFields(fields);
            
            // Refresh the groups list
            const groups = await getAllComponentGroups();
            
            // Process groups to ensure complete field data
            const processedGroups = groups.map(group => {
                if (group.fields && Array.isArray(group.fields)) {
                    const completeFields = group.fields.map(field => {
                        const fieldId = typeof field === 'string' ? field : field.id;
                        const completeField = fields.find(f => f.id === fieldId);
                        return completeField || field;
                    }).filter(Boolean);
                    
                    return {
                        ...group,
                        fields: completeFields
                    };
                }
                return group;
            });
            
            setSavedGroups(processedGroups);

            // Update the form data if we're editing
            const updatedGroup = processedGroups.find((g) => g.id === selectedGroup.id);
            if (updatedGroup) {
                setNewGroup({
                    ...newGroup,
                    fields: updatedGroup.fields,
                });
            }

            toast({
                title: "Fields Added",
                description: `${selectedFields.length} fields added to the group.`,
            });
        } catch (error) {
            console.error("Error adding fields to group:", error);
            toast({
                title: "Error",
                description: "Failed to add fields to the group. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            setShowAddFieldsDialog(false);
            setSelectedFields([]);
        }
    };

    const removeFieldFromGroupUI = async (groupId: string, fieldId: string) => {
        setLoading(true);
        try {
            // Remove the field using the service
            await removeFieldFromGroup(groupId, fieldId);

            // Fetch all fields again to ensure we have the latest data
            const fields = await getAllFieldComponents();
            setAvailableFields(fields);
            
            // Refresh groups list
            const groups = await getAllComponentGroups();
            
            // Process groups to ensure complete field data
            const processedGroups = groups.map(group => {
                if (group.fields && Array.isArray(group.fields)) {
                    const completeFields = group.fields.map(field => {
                        const fieldId = typeof field === 'string' ? field : field.id;
                        const completeField = fields.find(f => f.id === fieldId);
                        return completeField || field;
                    }).filter(Boolean);
                    
                    return {
                        ...group,
                        fields: completeFields
                    };
                }
                return group;
            });
            
            setSavedGroups(processedGroups);

            // Update form data if we're editing
            const updatedGroup = processedGroups.find((g) => g.id === groupId);
            if (updatedGroup && selectedGroup?.id === groupId) {
                setNewGroup({
                    ...newGroup,
                    fields: updatedGroup.fields,
                });
            }

            toast({
                title: "Field Removed",
                description: "Field has been removed from the group.",
            });
        } catch (error) {
            console.error("Error removing field from group:", error);
            toast({
                title: "Error",
                description: "Failed to remove field from the group. Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const openRefreshDialog = (groupId: string) => {
        setGroupToRefresh(groupId);
        setShowRefreshDialog(true);
        setRefreshOption("all");
        setFieldsToRefresh([]);
    };

    const handleRefreshFields = async () => {
        if (!groupToRefresh) return;
        setLoading(true);
        try {
          if (refreshOption === "all") {
            // Refresh all fields in the group
            const refreshSuccess = await refreshAllFieldsInGroup(groupToRefresh);
            
            if (refreshSuccess) {
              // After refresh, fetch updated group directly from database
              const updatedGroup = await getComponentGroupById(groupToRefresh);
              
              if (updatedGroup) {
                // Update the local state with fresh data from database
                setSavedGroups(prevGroups => 
                  prevGroups.map(group => 
                    group.id === groupToRefresh ? updatedGroup : group
                  )
                );
                
                // Update form if editing this group
                if (selectedGroup?.id === groupToRefresh) {
                  setNewGroup({
                    ...newGroup,
                    fields: updatedGroup.fields,
                  });
                  setSelectedGroup(updatedGroup);
                }
                
                toast({
                  title: "Fields Refreshed",
                  description: "All fields in the group have been refreshed."
                });
              }
            } else {
              toast({
                title: "Refresh Warning",
                description: "Some fields could not be refreshed. Please try again.",
                variant: "destructive",
              });
            }
          } else {
            // Refresh only selected fields
            if (fieldsToRefresh.length === 0) {
              toast({
                title: "No Fields Selected",
                description: "Please select fields to refresh or choose 'All Fields'.",
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
            
            // Get the most recent version of the updated container after all refreshes
            let finalUpdatedContainer = null;
            
            // Refresh each selected field
            for (const fieldId of fieldsToRefresh) {
              try {
                // Each call returns the updated container
                const updatedContainer = await addOrRefreshFieldInGroup(groupToRefresh, fieldId);
                finalUpdatedContainer = updatedContainer;
              } catch (error) {
                console.error(`Error refreshing field ${fieldId}:`, error);
              }
            }
            
            // If we got an updated container from any of the operations
            if (finalUpdatedContainer) {
              // Update the local state with the updated container
              setSavedGroups(prevGroups => 
                prevGroups.map(group => 
                  group.id === groupToRefresh ? finalUpdatedContainer : group
                )
              );
              
              // Update form if editing this group
              if (selectedGroup?.id === groupToRefresh) {
                setNewGroup({
                  ...newGroup,
                  fields: finalUpdatedContainer.fields,
                });
                setSelectedGroup(finalUpdatedContainer);
              }
              
              toast({
                title: "Fields Refreshed",
                description: `${fieldsToRefresh.length} fields have been refreshed.`
              });
            } else {
              toast({
                title: "Refresh Warning",
                description: "Could not refresh any fields. Please try again.",
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error("Error refreshing fields:", error);
          toast({
            title: "Error",
            description: "Failed to refresh fields. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
          setShowRefreshDialog(false);
          setGroupToRefresh(null);
          setFieldsToRefresh([]);
        }
      };

      
    const toggleFieldRefresh = (fieldId: string) => {
        setFieldsToRefresh((prev) => (prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]));
    };

    return (
        <div className="container mx-auto px-4 py-6">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                        Broker Group Builder
                        {loading && (
                            <span className="ml-2 inline-block">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-amber-500 dark:border-amber-400"></div>
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription className="text-gray-500 dark:text-gray-400">
                        Create and manage field groups for your applets
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <TabsTrigger
                                value="create"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
                            >
                                Create Group
                            </TabsTrigger>
                            <TabsTrigger
                                value="saved"
                                className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400"
                            >
                                Saved Groups ({savedGroups.length})
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="create" className="mt-6">
                            <CreateGroupForm
                                newGroup={newGroup}
                                selectedGroup={selectedGroup}
                                loading={loading}
                                handleLabelChange={handleLabelChange}
                                handleInputChange={handleInputChange}
                                handleSelectChange={handleSelectChange}
                                resetForm={resetForm}
                                saveGroup={saveGroup}
                                updateGroup={updateGroup}
                                openRefreshDialog={openRefreshDialog}
                                setShowAddFieldsDialog={setShowAddFieldsDialog}
                                removeFieldFromGroupUI={removeFieldFromGroupUI}
                            />
                        </TabsContent>

                        <TabsContent value="saved" className="mt-6">
                            <SavedGroupsList
                                loading={loading}
                                savedGroups={savedGroups}
                                setActiveTab={setActiveTab}
                                editGroup={editGroup}
                                confirmDeleteGroup={confirmDeleteGroup}
                                openRefreshDialog={openRefreshDialog}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Dialogs */}
            <AddFieldsDialog
                open={showAddFieldsDialog}
                onOpenChange={setShowAddFieldsDialog}
                availableFields={availableFields}
                selectedFields={selectedFields}
                toggleFieldSelection={toggleFieldSelection}
                addSelectedFieldsToGroup={addSelectedFieldsToGroup}
                loading={loading}
            />
            
            <RefreshFieldsDialog
                open={showRefreshDialog}
                onOpenChange={setShowRefreshDialog}
                refreshOption={refreshOption}
                setRefreshOption={setRefreshOption}
                groupToRefresh={groupToRefresh}
                savedGroups={savedGroups}
                fieldsToRefresh={fieldsToRefresh}
                toggleFieldRefresh={toggleFieldRefresh}
                handleRefreshFields={handleRefreshFields}
                loading={loading}
            />
            
            <ConfirmationDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                handleDeleteGroup={handleDeleteGroup}
                loading={loading}
            />
            
            <Toaster />
        </div>
    );
};

export default GroupBuilder;
