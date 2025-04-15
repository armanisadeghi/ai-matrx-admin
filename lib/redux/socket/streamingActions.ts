// lib/redux/socket/streamingActions.ts
import { 
    initStream,
    addStreamText, 
    addStreamData, 
    setStreamMessage,
    setStreamInfo,
    setStreamError,
    setStreamEnd,
    endStream, 
    clearStream 
  } from './streamingSlice';
  import { AppThunk, AppDispatch } from '../store';
  
  // Action creators
  export const startStream = (eventId: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(initStream({ eventId }));
  };
  
  export const updateStreamText = (eventId: string, text: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(addStreamText({ eventId, text }));
  };
  
  export const updateStreamData = (eventId: string, data: any): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(addStreamData({ eventId, data }));
  };
  
  export const updateStreamMessage = (eventId: string, message: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(setStreamMessage({ eventId, message }));
  };
  
  export const updateStreamInfo = (eventId: string, info: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(setStreamInfo({ eventId, info }));
  };
  
  export const updateStreamError = (eventId: string, error: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(setStreamError({ eventId, error }));
  };
  
  export const markStreamEnd = (eventId: string, isEnded: boolean = true): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(setStreamEnd({ eventId, end: isEnded }));
  };
  
  export const completeStream = (eventId: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(endStream({ eventId }));
  };
  
  export const removeStream = (eventId: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(clearStream({ eventId }));
  };
  
  // Convenience function to handle socket events
  export const handleStreamEvent = (eventId: string, event: any): AppThunk => async (dispatch: AppDispatch) => {
    // You can customize this based on your event structure
    if (event.text) {
      dispatch(addStreamText({ eventId, text: event.text }));
    }
    
    if (event.data) {
      dispatch(addStreamData({ eventId, data: event.data }));
    }
    
    if (event.message) {
      dispatch(setStreamMessage({ eventId, message: event.message }));
    }
    
    if (event.info) {
      dispatch(setStreamInfo({ eventId, info: event.info }));
    }
    
    if (event.error) {
      dispatch(setStreamError({ eventId, error: event.error }));
    }
    
    if (event.end) {
      dispatch(setStreamEnd({ eventId, end: event.end }));
      if (event.end === true) {
        dispatch(endStream({ eventId }));
      }
    }
  };
  
  // Example usage with socket.io
  export const connectStreamSocket = (socket: any, eventId: string): AppThunk => async (dispatch: AppDispatch) => {
    dispatch(initStream({ eventId }));
    
    socket.on('text', (text: string) => {
      dispatch(addStreamText({ eventId, text }));
    });
    
    socket.on('data', (data: any) => {
      dispatch(addStreamData({ eventId, data }));
    });
    
    socket.on('message', (message: string) => {
      dispatch(setStreamMessage({ eventId, message }));
    });
    
    socket.on('info', (info: string) => {
      dispatch(setStreamInfo({ eventId, info }));
    });
    
    socket.on('error', (error: string) => {
      dispatch(setStreamError({ eventId, error }));
    });
    
    socket.on('end', () => {
      dispatch(endStream({ eventId }));
    });
    
    return () => {
      // Cleanup function to disconnect
      socket.off('text');
      socket.off('data');
      socket.off('message');
      socket.off('info');
      socket.off('error');
      socket.off('end');
      dispatch(clearStream({ eventId }));
    };
  };