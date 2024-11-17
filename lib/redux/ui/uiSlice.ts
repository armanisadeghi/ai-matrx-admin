import {createSlice, PayloadAction} from "@reduxjs/toolkit";
import {loadDataForSchema, loadSchemaForContext} from "@/lib/redux/ui/uiThunks";

const initialState: UIState = {
    currentSchema: null,
    data: [],
    loading: false,
    errors: [],
};


const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setLocalData: (state, action: PayloadAction<Record<string, any>[]>) => {
            state.data = action.payload;
        },
        setErrors: (state, action: PayloadAction<string[]>) => {
            state.errors = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(loadSchemaForContext.pending, (state) => {
                state.loading = true;
                state.errors = [];
            })
            .addCase(loadSchemaForContext.fulfilled, (state, action) => {
                state.currentSchema = action.payload;
                state.loading = false;
            })
            .addCase(loadSchemaForContext.rejected, (state, action) => {
                state.loading = false;
                state.errors.push(action.error.message || 'Failed to load schema');
            })
            .addCase(loadDataForSchema.pending, (state) => {
                state.loading = true;
            })
            .addCase(loadDataForSchema.fulfilled, (state, action) => {
                state.data = action.payload;
                state.loading = false;
            })
            .addCase(loadDataForSchema.rejected, (state, action) => {
                state.loading = false;
                state.errors.push(action.error.message || 'Failed to load data');
            });
    },
});

export const { setLocalData, setErrors } = uiSlice.actions;
export default uiSlice.reducer;
