import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createFieldThunk,
    updateFieldThunk,
    deleteFieldThunk,
    fetchFieldsThunk,
    fetchFieldByIdThunk,
    setFieldPublicThunk,
    saveFieldThunk,
    saveFieldAndUpdateContainerThunk,
    saveFieldToContainerThunk,
} from "../thunks/fieldBuilderThunks";
import { FieldBuilder } from "../types";
import { FieldOption } from "@/features/applet/builder/builder.types";
import { v4 as uuidv4 } from "uuid";

// Default field configuration
export const DEFAULT_FIELD: Partial<FieldBuilder> = {
    label: "",
    description: "",
    helpText: "",
    group: "default",
    iconName: "",
    component: "input",
    required: false,
    disabled: false,
    placeholder: "",
    defaultValue: "",
    options: [],
    componentProps: {},
    includeOther: false,
    isPublic: false,
    isDirty: true,
    isLocal: true,
};

interface FieldsState {
    fields: Record<string, FieldBuilder>;
    isLoading: boolean;
    error: string | null;
    activeFieldId: string | null;
    newFieldId: string | null;
}

const initialState: FieldsState = {
    fields: {},
    isLoading: false,
    error: null,
    activeFieldId: null,
    newFieldId: null,
};

export const fieldBuilderSlice = createSlice({
    name: "fieldBuilder",
    initialState,
    reducers: {
        // Initialize a new field for creation
        startFieldCreation: (state, action: PayloadAction<Partial<FieldBuilder> | undefined>) => {
            const id = uuidv4();
            state.fields[id] = {
                ...DEFAULT_FIELD,
                id: id,
                ...action.payload,
            } as FieldBuilder;
            state.newFieldId = id;
            state.activeFieldId = id;
        },
        // Cancel creation of a local field
        cancelFieldCreation: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            if (state.fields[id] && state.fields[id].isLocal) {
                delete state.fields[id];
                if (state.newFieldId === id) {
                    state.newFieldId = null;
                }
                if (state.activeFieldId === id) {
                    state.activeFieldId = null;
                }
            }
        },
        // Set the active field for editing
        setActiveField: (state, action: PayloadAction<string | null>) => {
            state.activeFieldId = action.payload;
        },
        // Direct actions for top-level FieldBuilder properties
        setLabel: (state, action: PayloadAction<{ id: string; label: string }>) => {
            const { id, label } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], label, isDirty: true };
            }
        },
        setDescription: (state, action: PayloadAction<{ id: string; description?: string }>) => {
            const { id, description } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], description, isDirty: true };
            }
        },
        setHelpText: (state, action: PayloadAction<{ id: string; helpText?: string }>) => {
            const { id, helpText } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], helpText, isDirty: true };
            }
        },
        setGroup: (state, action: PayloadAction<{ id: string; group?: string }>) => {
            const { id, group } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], group, isDirty: true };
            }
        },
        setIconName: (state, action: PayloadAction<{ id: string; iconName?: string }>) => {
            const { id, iconName } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], iconName, isDirty: true };
            }
        },
        setComponent: (state, action: PayloadAction<{ id: string; component: FieldBuilder['component'] }>) => {
            const { id, component } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], component, isDirty: true };
            }
        },
        setRequired: (state, action: PayloadAction<{ id: string; required?: boolean }>) => {
            const { id, required } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], required, isDirty: true };
            }
        },
        setDisabled: (state, action: PayloadAction<{ id: string; disabled?: boolean }>) => {
            const { id, disabled } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], disabled, isDirty: true };
            }
        },
        setPlaceholder: (state, action: PayloadAction<{ id: string; placeholder?: string }>) => {
            const { id, placeholder } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], placeholder, isDirty: true };
            }
        },
        setDefaultValue: (state, action: PayloadAction<{ id: string; defaultValue?: any }>) => {
            const { id, defaultValue } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], defaultValue, isDirty: true };
            }
        },
        setComponentProps: (state, action: PayloadAction<{ id: string; componentProps: FieldBuilder['componentProps'] }>) => {
            const { id, componentProps } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], componentProps, isDirty: true };
            }
        },
        setIncludeOther: (state, action: PayloadAction<{ id: string; includeOther?: boolean }>) => {
            const { id, includeOther } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], includeOther, isDirty: true };
            }
        },
        setIsPublic: (state, action: PayloadAction<{ id: string; isPublic?: boolean }>) => {
            const { id, isPublic } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], isPublic, isDirty: true };
            }
        },
        setIsDirty: (state, action: PayloadAction<{ id: string; isDirty?: boolean }>) => {
            const { id, isDirty } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], isDirty };
            }
        },
        setIsLocal: (state, action: PayloadAction<{ id: string; isLocal?: boolean }>) => {
            const { id, isLocal } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], isLocal };
            }
        },
        // Actions for options
        addOption: (state, action: PayloadAction<{ id: string; option: FieldOption }>) => {
            const { id, option } = action.payload;
            if (state.fields[id]) {
                const options = state.fields[id].options || [];
                state.fields[id] = { ...state.fields[id], options: [...options, option], isDirty: true };
            }
        },
        updateOption: (state, action: PayloadAction<{ id: string; optionId: string; changes: Partial<FieldOption> }>) => {
            const { id, optionId, changes } = action.payload;
            if (state.fields[id] && state.fields[id].options) {
                const options = state.fields[id].options!.map((opt) =>
                    opt.id === optionId ? { ...opt, ...changes } : opt
                );
                state.fields[id] = { ...state.fields[id], options, isDirty: true };
            }
        },
        deleteOption: (state, action: PayloadAction<{ id: string; optionId: string }>) => {
            const { id, optionId } = action.payload;
            if (state.fields[id] && state.fields[id].options) {
                const options = state.fields[id].options!.filter(opt => opt.id !== optionId);
                state.fields[id] = { ...state.fields[id], options, isDirty: true };
            }
        },
        // Other existing actions
        deleteField: (state, action: PayloadAction<string>) => {
            delete state.fields[action.payload];
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
    extraReducers: (builder) => {
        // Create Field
        builder.addCase(createFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(createFieldThunk.fulfilled, (state, action) => {
            state.fields[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false };
            // Remove temporary field if it had a different ID
            Object.keys(state.fields).forEach((key) => {
                if (key.startsWith("temp_") && key !== action.payload.id) {
                    delete state.fields[key];
                }
            });
            state.isLoading = false;
        });
        builder.addCase(createFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to create field";
        });

        // Update Field
        builder.addCase(updateFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(updateFieldThunk.fulfilled, (state, action) => {
            state.fields[action.payload.id] = { ...action.payload, isDirty: false };
            state.isLoading = false;
        });
        builder.addCase(updateFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to update field";
        });

        // Delete Field
        builder.addCase(deleteFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(deleteFieldThunk.fulfilled, (state, action) => {
            delete state.fields[action.meta.arg];
            state.isLoading = false;
        });
        builder.addCase(deleteFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to delete field";
        });

        // Fetch Fields
        builder.addCase(fetchFieldsThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchFieldsThunk.fulfilled, (state, action) => {
            state.fields = action.payload.reduce((acc, field) => {
                acc[field.id] = field;
                return acc;
            }, {} as Record<string, FieldBuilder>);
            state.isLoading = false;
        });
        builder.addCase(fetchFieldsThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch fields";
        });

        // Fetch Field By Id
        builder.addCase(fetchFieldByIdThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchFieldByIdThunk.fulfilled, (state, action) => {
            state.fields[action.payload.id] = { ...action.payload, isDirty: false, isLocal: false };
            state.isLoading = false;
        });
        builder.addCase(fetchFieldByIdThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to fetch field";
        });

        // Set Field Public
        builder.addCase(setFieldPublicThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(setFieldPublicThunk.fulfilled, (state) => {
            state.isLoading = false;
        });
        builder.addCase(setFieldPublicThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to set field visibility";
        });

        // Unified Save Field
        builder.addCase(saveFieldThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(saveFieldThunk.fulfilled, (state, action) => {
            const oldId = state.activeFieldId;
            const newId = action.payload.id;
            
            // Handle case where local ID is replaced with server ID
            if (oldId && oldId !== newId) {
                // If the saved field had a temporary ID, we need to remove the temp entry
                delete state.fields[oldId];
                
                // Update active and new field IDs to the new server-generated ID
                if (state.activeFieldId === oldId) {
                    state.activeFieldId = newId;
                }
                
                if (state.newFieldId === oldId) {
                    state.newFieldId = null; // No longer a "new" field
                }
            }
            
            // Update the field with server data
            state.fields[newId] = { 
                ...action.payload, 
                isDirty: false, 
                isLocal: false
            };
            
            state.isLoading = false;
        });
        builder.addCase(saveFieldThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to save field";
        });

        // Save Field and Update Container
        builder.addCase(saveFieldAndUpdateContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(saveFieldAndUpdateContainerThunk.fulfilled, (state, action) => {
            const { field } = action.payload;
            if (field) {
                state.fields[field.id] = {
                    ...field,
                    isDirty: false,
                    isLocal: false,
                };
            }
            state.isLoading = false;
        });
        builder.addCase(saveFieldAndUpdateContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to save field and update container";
        });

        // Save Field to Container
        builder.addCase(saveFieldToContainerThunk.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(saveFieldToContainerThunk.fulfilled, (state) => {
            state.isLoading = false;
        });
        builder.addCase(saveFieldToContainerThunk.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.error.message || "Failed to save field to container";
        });
    },
});

export const {
    startFieldCreation,
    cancelFieldCreation,
    setActiveField,
    setLabel,
    setDescription,
    setHelpText,
    setGroup,
    setIconName,
    setComponent,
    setRequired,
    setDisabled,
    setPlaceholder,
    setDefaultValue,
    setComponentProps,
    setIncludeOther,
    setIsPublic,
    setIsDirty,
    setIsLocal,
    addOption,
    updateOption,
    deleteOption,
    deleteField,
    setLoading,
    setError,
} = fieldBuilderSlice.actions;

export default fieldBuilderSlice.reducer;