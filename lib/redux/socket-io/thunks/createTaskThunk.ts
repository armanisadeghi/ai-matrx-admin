// File Location: lib/redux/socket-io/thunks/createTaskThunk.ts

import { createAsyncThunk } from "@reduxjs/toolkit";
import { initializeTask, setTaskFields } from "../slices/socketTasksSlice";
import { selectPrimaryConnection } from "../selectors";
import { RootState } from "../../store";
import { v4 as uuidv4 } from "uuid";

export const createTask = createAsyncThunk<
  string,
  { 
    service: string; 
    taskName: string; 
    initialData?: Record<string, any>; 
    connectionId?: string;
    taskId?: string;
  },
  { state: RootState }
>(
  "socketTasks/createTask",
  async ({ service, taskName, initialData, connectionId, taskId }, { dispatch, getState }) => {
    const state = getState();
    const resolvedConnectionId =
      connectionId || selectPrimaryConnection(state)?.connectionId;

    if (!resolvedConnectionId) {
      throw new Error("No primary connection available and no connectionId provided");
    }

    const resolvedTaskId = taskId || uuidv4();
    dispatch(
      initializeTask({
        taskId: resolvedTaskId,
        service,
        taskName,
        connectionId: resolvedConnectionId,
      })
    );

    if (initialData) {
      dispatch(
        setTaskFields({
          taskId: resolvedTaskId,
          fields: initialData,
        })
      );
    }

    return resolvedTaskId;
  }
);