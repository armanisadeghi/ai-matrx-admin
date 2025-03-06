import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState, AppDispatch } from '../../store';
import { setDynamicEvent, updateDynamicEventStatus, updateDynamicEventStream, removeDynamicEvent } from './dynamicEventsSlice';
import { DynamicEvent, EventDetails, TaskDetails } from './types';
import { SocketManager } from '@/lib/redux/socket/manager';

export const setupDynamicEventListener = createAsyncThunk<void, string, { state: RootState, dispatch: AppDispatch }>(
    'dynamicEvents/setupListener',
    async (eventName, { dispatch, getState }) => {
        const state = getState();

        const socketManager = SocketManager.getInstance();

        const listener = (data: any) => {
            console.log(`dynamic Event Thunks - Listener received data for ${eventName}:`, data);
            if (typeof data === 'string') {
                dispatch(updateDynamicEventStream({ eventName, textStream: data }));
            } else if (data && data.data) {
                dispatch(updateDynamicEventStream({ eventName, textStream: data.data }));
            }
            if (data && data.status) {
                dispatch(updateDynamicEventStatus({ eventName, status: data.status }));
            }
        };

        socketManager.addDynamicEventListener(eventName, listener);

        const dynamicEvent: DynamicEvent = {
            eventName,
            namespace: "UserSession",
            sid: socketManager.getSocketSid() || '',
            status: 'assigned',
            textStream: '',
        };

        dispatch(setDynamicEvent(dynamicEvent));
    }
);

export const removeDynamicEventListener = createAsyncThunk<void, string, { state: RootState }>(
    'dynamicEvents/removeListener',
    async (eventName, { dispatch, getState }) => {
        const state = getState();
        const socketManager = SocketManager.getInstance();

        socketManager.removeDynamicEventListener(eventName);
        dispatch(removeDynamicEvent(eventName));
    }
);

export const submitEvent = createAsyncThunk<void, EventDetails, { state: RootState }>(
    'dynamicEvents/submitEvent',
    async (eventDetails, { dispatch, getState }) => {
        const state = getState();
        const socketManager = SocketManager.getInstance(matrixId, sessionUrl, socketNamespace);

        // Setup listeners for each task
        eventDetails.tasks.forEach((task, index) => {
            const eventName = `${socketManager.getSocketSid()}_${eventDetails.event}_${task.task}_${index}`;
            console.log('Setting up listener for:', eventName);
            dispatch(setupDynamicEventListener(eventName));
        });

        // Submit the event using the startTask method from SocketManager
        socketManager.startTask(eventDetails.event, eventDetails.tasks);
    }
);

export const submitTaskData = createAsyncThunk<void, { eventName: string, task: string, taskData: any }, { state: RootState }>(
    'dynamicEvents/submitTaskData',
    async ({ eventName, task, taskData }, { dispatch, getState }) => {
        console.log('submitTaskData thunk started', { eventName, task, taskData });
        const state = getState();
        const { requestStream } = state.dynamicEvents;

        const taskDetails: TaskDetails = {
            task,
            index: 0,
            stream: requestStream,
            taskData,
        };

        const eventDetails: EventDetails = {
            event: eventName,
            tasks: [taskDetails],
        };

        console.log('Dispatching submitEvent with:', eventDetails);
        await dispatch(submitEvent(eventDetails));
        console.log('submitEvent dispatched');
    }
);
