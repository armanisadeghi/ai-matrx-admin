// redux/features/socket/socketActions.ts

import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../../store';
import { SocketManager } from '@/lib/socketio/SocketManager';
import { setSocketStatus, setIsAuthenticated, setSocketSid, setSocketError } from './socketSlice';
import { SocketTask } from '@/lib/socketio/types';

export const initializeSocket = createAsyncThunk(
    'socket/initialize',
    async (_, { dispatch, getState }) => {
            const state = getState() as RootState;
            const { matrixId } = state.user.currentUser!;
            const { sessionUrl, socketNamespace } = state.config;

            const socketManager = SocketManager.getInstance(matrixId, sessionUrl, socketNamespace);
            socketManager.initialize(
                (status) => dispatch(setSocketStatus(status)),
                (isAuth) => dispatch(setIsAuthenticated(isAuth)),
                (sid) => dispatch(setSocketSid(sid))
            );
            socketManager.setupSocket();
    }
);

export const authenticateSocket = createAsyncThunk(
    'socket/authenticate',
    async (_, { getState, dispatch }) => {
            const state = getState() as RootState;
            const { currentUser } = state.user;
            const { sessionUrl, socketNamespace } = state.config;

            if (!currentUser) {
                    dispatch(setSocketError('No active user'));
                    return;
            }

            const socketManager = SocketManager.getInstance(currentUser.matrixId, sessionUrl, socketNamespace);
            socketManager.authenticateUser(currentUser);
    }
);

export const startSocketTask = createAsyncThunk(
    'socket/startTask',
    async ({ eventName, data }: { eventName: string; data: SocketTask }, { getState }) => {
            const state = getState() as RootState;
            const { matrixId } = state.user.currentUser!;
            const { sessionUrl, socketNamespace } = state.config;

            const socketManager = SocketManager.getInstance(matrixId, sessionUrl, socketNamespace);
            socketManager.startTask(eventName, data);
    }
);

export const emitSocketMessage = createAsyncThunk(
    'socket/emitMessage',
    async ({ eventName, data }: { eventName: string; data: any }, { getState }) => {
            const state = getState() as RootState;
            const { matrixId } = state.user.currentUser!;
            const { sessionUrl, socketNamespace } = state.config;

            const socketManager = SocketManager.getInstance(matrixId, sessionUrl, socketNamespace);
            socketManager.emitMessage(eventName, data);
    }
);
