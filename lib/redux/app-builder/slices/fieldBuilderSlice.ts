import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    createFieldThunk,
    updateFieldThunk,
    deleteFieldThunk,
    fetchFieldsThunk,
    setFieldPublicThunk,
} from "../thunks/fieldBuilderThunks";
import { FieldBuilder } from "../types";
import { RootState } from "@/lib/redux";

interface FieldsState {
    fields: Record<string, FieldBuilder>;
    isLoading: boolean;
    error: string | null;
}

const initialState: FieldsState = {
    fields: {},
    isLoading: false,
    error: null,
};

export const fieldBuilderSlice = createSlice({
    name: "fieldBuilder",
    initialState,
    reducers: {
        setField: (state, action: PayloadAction<FieldBuilder>) => {
            state.fields[action.payload.id] = action.payload;
        },
        updateField: (state, action: PayloadAction<{ id: string; changes: Partial<FieldBuilder> }>) => {
            const { id, changes } = action.payload;
            if (state.fields[id]) {
                state.fields[id] = { ...state.fields[id], ...changes };
            }
        },
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
            state.fields[action.payload.id] = action.payload;
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
            state.fields[action.payload.id] = action.payload;
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
    },
});

export const { setField, updateField, deleteField, setLoading, setError } = fieldBuilderSlice.actions;

export default fieldBuilderSlice.reducer;

