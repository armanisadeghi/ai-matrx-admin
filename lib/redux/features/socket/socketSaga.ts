// // lib/redux/features/socket/socketSaga.ts

// import { eventChannel, EventChannel } from "redux-saga";
// import { take, put, fork, call, select } from "redux-saga/effects";
// // import { SocketManager } from "@/lib/redux/socket/SocketManager";
// import {
//   setSocketStatus,
//   setSocketSid,
//   setSocketError,
//   startStreamingTask,
//   endStreamingTask,
//   setFullUrl,
//   setCurrentServer,
//   setNamespace,
// } from "@/lib/redux/features/socket/socketSlice";
// import { appendStreamChunk, updateEventResult, setEventError } from "@/lib/redux/features/dynamicEvents/dynamicEventsSlice";
// import { RootState } from "@/lib/redux/store";

// export function* socketSaga() {
//   const socketManager = SocketManager.getInstance();

//   yield put(setSocketStatus("pending"));
//   try {
//       yield call([socketManager, socketManager.connect]);
//       const socket = yield call([socketManager, socketManager.getSocket]);
//       const serverUrl = socket.io.uri && socket.nsp ? socket.io.uri.replace(socket.nsp, "") : "unknown";
//       const fullUrl = socket.io.uri || "unknown";
//       const namespace = socket.nsp || "/UserSession";
//       yield put(setSocketSid(socket.id));
//       yield put(setSocketStatus("running"));
//       yield put(setCurrentServer(serverUrl));
//       yield put(setFullUrl(fullUrl));
//       yield put(setNamespace(namespace));
//   } catch (error) {
//       yield put(setSocketError(error.message || "Socket connection failed"));
//       return;
//   }

//   const socketEventChannel: EventChannel<any> = yield call([socketManager, socketManager.createEventChannel]);
//   yield fork(watchSocketEvents, socketEventChannel);
// }

// function* watchSocketEvents(eventChannel: EventChannel<any>) {
//   while (true) {
//     const payload = yield take(eventChannel);
//     yield fork(handleSocketEvent, payload);
//   }
// }

// function* handleSocketEvent({ eventName, args }: { eventName: string; args: any[] }) {
//     const parts = eventName.split("_");
//     if (parts.length >= 3) {
//       const [sid, taskName, taskIndex] = parts;
//       const data = args[0];
//       yield put({
//         type: "SOCKET_RESPONSE_RECEIVED",
//         payload: { sid, eventName: taskName, taskIndex: parseInt(taskIndex, 10), data },
//       });
  
//       const fullEventName = `${sid}_${taskName}_${taskIndex}`;
      
//       const events = yield select((state: RootState) => state.dynamicEvents.events);
      
//       const eventId = Object.keys(events).find(
//         (id) => events[id].socketEventName === fullEventName
//       );
  
//       if (eventId) {
//         if (data?.data) {
//           yield put(appendStreamChunk({ eventId, chunk: data.data }));
//         }
//         if (data?.end === true || data?.end === "true" || data?.end === "True") {
//           yield put(updateEventResult({ eventId, result: data.data || "" }));
//           yield put(endStreamingTask({ eventName: fullEventName, status: "completed" }));
//         }
//         if (data?.error) {
//           yield put(setEventError({ eventId, error: data.error }));
//           yield put(endStreamingTask({ eventName: fullEventName, status: "failed", error: data.error }));
//         }
//       }
  
//       if (data?.stream) {
//         yield put(startStreamingTask(fullEventName));
//       }
//     }
//   }