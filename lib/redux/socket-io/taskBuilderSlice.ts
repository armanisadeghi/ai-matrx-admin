import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TaskBuilderState {
  service: string | null;
  taskName: string | null;
  taskData: Record<string, any>;
}

const initialState: TaskBuilderState = {
  service: null,
  taskName: null,
  taskData: {},
};

export const taskBuilderSlice = createSlice({
  name: 'taskBuilder',
  initialState,
  reducers: {
    setService: (state, action: PayloadAction<string>) => {
      state.service = action.payload;
      state.taskName = null; // Reset taskName when service changes
      state.taskData = {}; // Reset taskData
    },
    setTaskName: (state, action: PayloadAction<string>) => {
      state.taskName = action.payload;
      state.taskData = {}; // Reset taskData when taskName changes
    },
    updateTaskData: (state, action: PayloadAction<{ field: string; value: any }>) => {
      state.taskData[action.payload.field] = action.payload.value;
    },
    resetTask: (state) => {
      state.service = null;
      state.taskName = null;
      state.taskData = {};
    },
  },
});

export const { setService, setTaskName, updateTaskData, resetTask } = taskBuilderSlice.actions;
export default taskBuilderSlice.reducer;