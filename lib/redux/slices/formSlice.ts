import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FormState {
    [key: string]: any;
}

const initialState: FormState = {};

const formSlice = createSlice({
    name: 'form',
    initialState,
    reducers: {
        updateFormField: (state, action: PayloadAction<{ name: string; value: any }>) => {
            const { name, value } = action.payload;
            state[name] = value;
        },
        submitForm: (state, action: PayloadAction<FormState>) => {
            // You can add any logic here for form submission
            console.log('Form submitted:', action.payload);
            // Optionally, you can reset the state after submission
            return initialState;
        },
    },
});

export const { updateFormField, submitForm } = formSlice.actions;
export default formSlice.reducer;