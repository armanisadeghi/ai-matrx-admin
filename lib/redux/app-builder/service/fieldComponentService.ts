import { supabase } from "@/utils/supabase/client";
import { normalizeFieldDefinition } from "@/types/customAppTypes";
import { FieldBuilder } from "../types";

export type FieldComponentDB = {
    id: string;
    created_at?: string;
    updated_at?: string;
    label: string;
    description?: string;
    help_text?: string;
    component_group?: string;
    icon_name?: string;
    component: string;
    required?: boolean;
    placeholder?: string;
    default_value?: any;
    include_other?: boolean;
    options?: any;
    component_props?: any;
    user_id?: string;
    is_public?: boolean;
    authenticated_read?: boolean;
    public_read?: boolean;
}

/**
 * Converts a FieldBuilder to the database format
 */
export const fieldDefinitionToDBFormat = async (
    field: FieldBuilder
): Promise<Omit<FieldComponentDB, "created_at" | "updated_at">> => {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }
    return {
        id: field.id || null,
        label: field.label || "",
        description: field.description || null,
        help_text: field.helpText || null,
        component_group: field.group || null,
        icon_name: field.iconName || null,
        component: field.component || "input",
        required: field.required !== undefined ? field.required : null,
        placeholder: field.placeholder || null,
        default_value: field.defaultValue !== undefined ? field.defaultValue : null,
        include_other: field.includeOther !== undefined ? field.includeOther : null,
        options: field.options || null,
        component_props: field.componentProps || null,
        user_id: userId,
        is_public: field.isPublic !== undefined ? field.isPublic : false,
        authenticated_read: field.authenticatedRead !== undefined ? field.authenticatedRead : true,
        public_read: field.publicRead !== undefined ? field.publicRead : true,
    };
};

/**
 * Converts a database record to a FieldBuilder
 */
export const dbToFieldDefinition = (dbRecord: FieldComponentDB): FieldBuilder => {
    return normalizeFieldDefinition({
        id: dbRecord.id,
        label: dbRecord.label,
        description: dbRecord.description,
        helpText: dbRecord.help_text,
        group: dbRecord.component_group,
        iconName: dbRecord.icon_name,
        component: dbRecord.component as any,
        required: dbRecord.required,
        placeholder: dbRecord.placeholder,
        defaultValue: dbRecord.default_value,
        includeOther: dbRecord.include_other,
        options: dbRecord.options,
        componentProps: dbRecord.component_props,
        isPublic: dbRecord.is_public,
        authenticatedRead: dbRecord.authenticated_read,
        publicRead: dbRecord.public_read,
    });
};

/**
 * Fetches all field components for the current user
 */
export const getAllFieldComponents = async (): Promise<FieldBuilder[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
        throw new Error("User not authenticated");
    }

    const { data, error } = await supabase.from("field_components").select("*").eq("user_id", userId);

    if (error) {
        console.error("Error fetching field components:", error);
        throw error;
    }

    return (data || []).map(dbToFieldDefinition);
};

/**
 * Fetches a specific field component by ID
 */
export const getFieldComponentById = async (id: string): Promise<FieldBuilder | null> => {
    const { data, error } = await supabase.from("field_components").select("*").eq("id", id).single();

    if (error) {
        if (error.code === "PGRST116") {
            return null;
        }
        console.error("Error fetching field component:", error);
        throw error;
    }

    return data ? dbToFieldDefinition(data) : null;
};

/**
 * Creates a new field component
 */
export const createFieldComponent = async (fieldDefinition: FieldBuilder): Promise<FieldBuilder> => {
    const dbData = await fieldDefinitionToDBFormat(fieldDefinition);


    console.log("Creating field component with data:", JSON.stringify(dbData, null, 2));

    try {
        const { data, error } = await supabase.from("field_components").insert(dbData).select().single();

        if (error) {
            console.error("Error creating field component:", error.message, error.details, error.hint);
            throw error;
        }

        if (!data) {
            throw new Error("No data returned from insert operation");
        }

        return dbToFieldDefinition(data);
    } catch (err) {
        console.error("Exception in createFieldComponent:", err);
        throw err;
    }
};

/**
 * Updates an existing field component
 */
export const updateFieldComponent = async (id: string, fieldDefinition: FieldBuilder): Promise<FieldBuilder> => {
    const dbData = await fieldDefinitionToDBFormat(fieldDefinition);

    try {
        const { data, error } = await supabase
            .from("field_components")
            .update(dbData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating field component:", error.message, error.details, error.hint);
            throw error;
        }

        if (!data) {
            throw new Error("No data returned from update operation");
        }

        return dbToFieldDefinition(data);
    } catch (err) {
        console.error("Exception in updateFieldComponent:", err);
        throw err;
    }
};

/**
 * Deletes a field component
 */
export const deleteFieldComponent = async (id: string): Promise<void> => {
    const { error } = await supabase.from("field_components").delete().eq("id", id);

    if (error) {
        console.error("Error deleting field component:", error);
        throw error;
    }
};

/**
 * Duplicates a field component
 */
export const duplicateFieldComponent = async (id: string): Promise<FieldBuilder> => {
    const component = await getFieldComponentById(id);

    if (!component) {
        throw new Error(`Field component with id ${id} not found`);
    }

    const dbData = await fieldDefinitionToDBFormat(component);
    dbData.label = `${dbData.label} (Copy)`;

    const { data, error } = await supabase.from("field_components").insert(dbData).select().single();

    if (error) {
        console.error("Error duplicating field component:", error);
        throw error;
    }

    return dbToFieldDefinition(data);
};

/**
 * Fetches public field components
 */
export const getPublicFieldComponents = async (): Promise<FieldBuilder[]> => {
    const { data, error } = await supabase.from("field_components").select("*").eq("is_public", true);

    if (error) {
        console.error("Error fetching public field components:", error);
        throw error;
    }

    return (data || []).map(dbToFieldDefinition);
};

/**
 * Make a field component public or private
 */
export const setFieldComponentPublic = async (id: string, isPublic: boolean): Promise<void> => {
    const { error } = await supabase.from("field_components").update({ is_public: isPublic }).eq("id", id);

    if (error) {
        console.error("Error updating field component visibility:", error);
        throw error;
    }
};