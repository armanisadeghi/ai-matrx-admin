export type {
  BackendStreamHandlers,
  ConsumeBackendStreamResult,
} from "./consume-backend-stream";
export {
  consumeBackendStreamResponse,
  withRawEventCapture,
} from "./consume-backend-stream";

export type {
  BackendStreamArrivalEntry,
  BackendStreamFoldBucket,
  BackendStreamFoldState,
  UnknownWireEvent,
} from "./fold-stream-events";
export {
  foldBackendStreamEvents,
  foldStreamEventsToToolTestState,
  streamEventsToRenderedToolCalls,
} from "./fold-stream-events";

export { buildToolCallObjectsForPreview } from "./build-tool-call-objects";
export {
  buildToolTesterStreamCallbacks,
  buildToolTestStreamCallbacks,
} from "./tool-tester-stream-callbacks";
export { toolEventPayloadToToolStreamEvent } from "./normalize-tool-event";
export {
  ndjsonToFoldState,
  ndjsonToRenderedToolCalls,
  parseNdjsonStringToStreamEvents,
} from "./ndjson";
