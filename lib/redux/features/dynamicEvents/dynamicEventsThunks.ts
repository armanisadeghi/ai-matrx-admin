// import { createAsyncThunk } from "@reduxjs/toolkit";
// import { RootState, AppDispatch } from "../../store";
// import { SchemaTaskManager } from "@/lib/redux/socket/schema/SchemaTaskManager";
// import { SERVICE_NAMES } from "@/constants/socket-constants";
// import { startSocketTask } from "../socket/socketActions";
// import {
//   updateEventStatus,
//   setSocketEventName,
//   setEventError,
//   DynamicEvent,
// } from "./dynamicEventsSlice";
// import { isTaskReady } from "./dynamicEventsSlice";

// export const submitDynamicEvent = createAsyncThunk<
//   void,
//   { eventId: string; stream?: boolean },
//   { state: RootState; dispatch: AppDispatch }
// >(
//   "dynamicEvents/submitDynamicEvent",
//   async ({ eventId, stream = false }, { dispatch, getState }) => {
//     const state = getState();
//     const event: DynamicEvent = state.dynamicEvents.events[eventId];
//     if (!event) throw new Error(`Event ${eventId} not found`);

//     if (!isTaskReady(event)) {
//       throw new Error(`Task ${event.taskName} is not ready: missing required fields`);
//     }

//     const manager = new SchemaTaskManager(event.service as (typeof SERVICE_NAMES)[number], event.taskName);
//     const taskBuilder = manager.createTask();
//     Object.entries(event.taskData).forEach(([key, value]) => taskBuilder.setArg(key, value));
//     const taskData = taskBuilder.getTaskData().getTask();

//     dispatch(updateEventStatus({ eventId, status: "pending" }));

//     const socketAction = await dispatch(
//       startSocketTask({
//         eventName: `${event.service}/${event.taskName}`,
//         data: [taskData],
//         isStreaming: stream,
//       })
//     );

//     if (startSocketTask.fulfilled.match(socketAction)) {
//       dispatch(setSocketEventName({ eventId, socketEventName: socketAction.payload.eventName }));
//     } else {
//       throw new Error(socketAction.error.message || "Failed to start task");
//     }
//   }
// );