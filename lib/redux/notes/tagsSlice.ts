// store/tagsSlice.ts
'use client';

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Tag, TagsState } from '@/types/notes.types';

const initialState: TagsState = {
    tags: [],
};

const tagsSlice = createSlice({
    name: 'tags',
    initialState,
    reducers: {
        initialize: (state, action: PayloadAction<TagsState>) => {
            return action.payload;
        },
        addTag: (state, action: PayloadAction<Tag>) => {
            state.tags.push(action.payload);
        },
        removeTag: (state, action: PayloadAction<string>) => {
            state.tags = state.tags.filter(tag => tag.id !== action.payload);
        },
    },
});

export const {
    initialize,
    addTag,
    removeTag
} = tagsSlice.actions;

export default tagsSlice.reducer;
