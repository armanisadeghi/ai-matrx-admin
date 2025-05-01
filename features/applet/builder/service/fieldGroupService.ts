import { supabase } from "@/utils/supabase/client";
import { FieldDefinition, ComponentGroup } from "../builder.types";
import { dbToFieldDefinition, FieldComponentDB } from "./fieldComponentService";


export type ComponentGroupDB = {
    id: string;
    created_at?: string;
    updated_at?: string;
    label: string;
    short_label?: string;
    description?: string;
    hide_description?: boolean;
    help_text?: string;
    fields?: any[];
    user_id?: string;
    is_public?: boolean;
    authenticated_read?: boolean;
    public_read?: boolean;
};

/**
 * Converts a ComponentGroup to the database format
 */
export const componentGroupToDBFormat = async (
    group: ComponentGroup
): Promise<Omit<ComponentGroupDB, "id" | "created_at" | "updated_at">> => {
    // Get the current user ID from the session
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    return {
        label: group.label || "",
        short_label: group.shortLabel || null,
        description: group.description || null,
        hide_description: group.hideDescription !== undefined ? group.hideDescription : false,
        help_text: group.helpText || null,
        fields: group.fields || [], // Fields will be handled separately with RPCs
        user_id: userId,
        is_public: group.isPublic !== undefined ? group.isPublic : false,
        authenticated_read: group.authenticatedRead !== undefined ? group.authenticatedRead : true,
        public_read: group.publicRead !== undefined ? group.publicRead : false,
    };
};

/**
 * Converts a database record to a ComponentGroup
 */
export const dbToComponentGroup = (dbRecord: ComponentGroupDB): ComponentGroup => {
  let processedFields: FieldDefinition[] = [];
  
  // Process fields from database
  if (Array.isArray(dbRecord.fields)) {
      processedFields = dbRecord.fields
          .map((field: any) => {
              // Only process complete field objects
              if (field && typeof field === "object" && field.label && field.component) {
                  try {
                      return dbToFieldDefinition(field as FieldComponentDB);
                  } catch (error) {
                      console.error("Error processing field:", field.id, error);
                      return null;
                  }
              }
              // Log warning for incomplete fields
              if (field && field.id) {
                  console.warn(`Incomplete field found in group ${dbRecord.id}: ${field.id}`);
              }
              return null;
          })
          .filter((field): field is FieldDefinition => field !== null);
  }
  
  return {
      id: dbRecord.id,
      label: dbRecord.label,
      shortLabel: dbRecord.short_label,
      description: dbRecord.description,
      hideDescription: dbRecord.hide_description,
      helpText: dbRecord.help_text,
      fields: processedFields,
      isPublic: dbRecord.is_public,
      authenticatedRead: dbRecord.authenticated_read,
      publicRead: dbRecord.public_read,
  };
};

/**
 * Fetches all component groups for the current user
 */
export const getAllComponentGroups = async (): Promise<ComponentGroup[]> => {
    // Get the current user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.from("component_groups").select("*").eq("user_id", userId);

    if (error) {
        console.error("Error fetching component groups:", error);
        throw error;
    }

    return (data || []).map(dbToComponentGroup);
};

/**
 * Fetches a specific component group by ID
 */
export const getComponentGroupById = async (id: string): Promise<ComponentGroup | null> => {
    const { data, error } = await supabase.from("component_groups").select("*").eq("id", id).single();

    if (error) {
        if (error.code === "PGRST116") {
            // Record not found
            return null;
        }
        console.error("Error fetching component group:", error);
        throw error;
    }

    return data ? dbToComponentGroup(data) : null;
};

/**
 * Creates a new component group with fields
 */
export const createComponentGroup = async (group: ComponentGroup): Promise<ComponentGroup> => {
    try {
        // Check if we have fields to add
        if (group.fields && group.fields.length > 0) {
            // Use the RPC function to create group with fields in one operation
            const fieldIds = group.fields.map((field) => field.id).filter(Boolean) as string[];

            if (fieldIds.length > 0) {
                // Call RPC to create group with fields
                const { data: createdId, error: rpcError } = await supabase.rpc("create_component_group", {
                    p_label: group.label,
                    p_short_label: group.shortLabel || null,
                    p_description: group.description || null,
                    p_hide_description: group.hideDescription || false,
                    p_help_text: group.helpText || null,
                    p_field_ids: fieldIds,
                });

                if (rpcError) {
                    console.error("Error creating group with fields:", rpcError);
                    throw rpcError;
                }

                // Fetch the complete group with fields
                const newGroup = await getComponentGroupById(createdId);
                if (!newGroup) {
                    throw new Error("Failed to retrieve newly created group");
                }

                return newGroup;
            }
        }

        // If no fields, use standard approach
        const dbData = await componentGroupToDBFormat(group);

        // Remove the fields property as we'll handle that separately
        const { fields, ...restData } = dbData;

        const { data, error } = await supabase.from("component_groups").insert(restData).select().single();

        if (error) {
            console.error("Error creating component group:", error.message, error.details, error.hint);
            throw error;
        }

        if (!data) {
            throw new Error("No data returned from insert operation");
        }

        return dbToComponentGroup(data);
    } catch (err) {
        console.error("Exception in createComponentGroup:", err);
        throw err;
    }
};

/**
 * Updates an existing component group (without modifying its fields)
 */
export const updateComponentGroup = async (id: string, group: ComponentGroup): Promise<ComponentGroup> => {
    const dbData = await componentGroupToDBFormat(group);

    // Remove the fields property as we'll handle that separately
    const { fields, ...restData } = dbData;

    try {
        const { data, error } = await supabase.from("component_groups").update(restData).eq("id", id).select().single();

        if (error) {
            console.error("Error updating component group:", error.message, error.details, error.hint);
            throw error;
        }

        if (!data) {
            throw new Error("No data returned from update operation");
        }

        return dbToComponentGroup(data);
    } catch (err) {
        console.error("Exception in updateComponentGroup:", err);
        throw err;
    }
};

/**
 * Deletes a component group
 */
export const deleteComponentGroup = async (id: string): Promise<void> => {
    const { error } = await supabase.from("component_groups").delete().eq("id", id);

    if (error) {
        console.error("Error deleting component group:", error);
        throw error;
    }
};

/**
 * Adds a field to a component group
 */
export const addFieldToGroup = async (groupId: string, fieldId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc("add_field_to_group", {
            p_group_id: groupId,
            p_field_id: fieldId,
        });

        if (error) {
            console.error("Error adding field to group:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in addFieldToGroup:", err);
        throw err;
    }
};

/**
 * Refreshes a single field in a component group
 */
export const refreshFieldInGroup = async (groupId: string, fieldId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc("refresh_field_in_group", {
            p_group_id: groupId,
            p_field_id: fieldId,
        });

        if (error) {
            console.error("Error refreshing field in group:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in refreshFieldInGroup:", err);
        throw err;
    }
};

/**
 * Refreshes all fields in a component group
 */
export const refreshAllFieldsInGroup = async (groupId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc("refresh_all_fields_in_group", {
            p_group_id: groupId,
        });

        if (error) {
            console.error("Error refreshing all fields in group:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in refreshAllFieldsInGroup:", err);
        throw err;
    }
};

/**
 * Removes a field from a component group
 */
export const removeFieldFromGroup = async (groupId: string, fieldId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc("remove_field_from_group", {
            p_group_id: groupId,
            p_field_id: fieldId,
        });

        if (error) {
            console.error("Error removing field from group:", error);
            throw error;
        }

        return !!data;
    } catch (err) {
        console.error("Exception in removeFieldFromGroup:", err);
        throw err;
    }
};

/**
 * Duplicates a component group
 */
export const duplicateComponentGroup = async (id: string): Promise<ComponentGroup> => {
    // First get the group to duplicate
    const group = await getComponentGroupById(id);

    if (!group) {
        throw new Error(`Component group with id ${id} not found`);
    }

    // Create a copy with a new label
    const newGroup = {
        ...group,
        id: "", // Clear the ID so a new one will be generated
        label: `${group.label} (Copy)`,
    };

    // Create the new group with its fields
    return await createComponentGroup(newGroup);
};

/**
 * Fetches public component groups
 */
export const getPublicComponentGroups = async (): Promise<ComponentGroup[]> => {
    const { data, error } = await supabase.from("component_groups").select("*").eq("is_public", true);

    if (error) {
        console.error("Error fetching public component groups:", error);
        throw error;
    }

    return (data || []).map(dbToComponentGroup);
};

/**
 * Make a component group public or private
 */
export const setComponentGroupPublic = async (id: string, isPublic: boolean): Promise<void> => {
    const { error } = await supabase.from("component_groups").update({ is_public: isPublic }).eq("id", id);

    if (error) {
        console.error("Error updating component group visibility:", error);
        throw error;
    }
};

