import { Middleware, MiddlewareAPI, UnknownAction } from "@reduxjs/toolkit";
import { call, takeEvery } from "redux-saga/effects";
import createSagaMiddleware from "redux-saga";
import _ from "lodash";
import StorageManager from "@/utils/supabase/StorageManager";
import { getEntitySlice } from "@/lib/redux/entity/entitySlice";


// ====================================================
// This is currently not implemented because I don't have time to test it. I think it could be a great addition but needs to be tested and confirmed to not break anything or make things inefficient.
// ====================================================



// Types
type ActionPattern = string | RegExp | ((action: UnknownAction) => boolean);

type HandlerType = "PRE_PROCESS" | "SIDE_EFFECT" | "TRANSFORM" | "CONTROLLED";

interface ActionHandler {
  pattern: ActionPattern;
  handler: (action: UnknownAction, store: MiddlewareAPI<any, any>, next: (action: UnknownAction) => any) => any;
  type: HandlerType;
  priority: number;
  id: string;
}

// Optimized throttle for storage operations
const throttledStorageOperations = _.throttle(
  (storage: StorageManager, payload: Partial<any>) => {
    if (payload.currentBucket && payload.currentBucket !== storage.getCurrentBucket()?.name) {
      storage.selectBucket(payload.currentBucket);
    }
    if (payload.currentPath) {
      storage.navigateToFolder(payload.currentPath);
    }
  },
  1000,
  { leading: true, trailing: false }
);

// Precomputed pattern helpers
const patternCache = new Map<string, RegExp>();
const patternHelpers = {
  exact: (type: string): string => type,
  startsWith: (prefix: string): RegExp => {
    const key = `startsWith:${prefix}`;
    if (!patternCache.has(key)) {
      patternCache.set(key, new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/.*$`));
    }
    return patternCache.get(key)!;
  },
  endsWith: (suffix: string): RegExp => {
    const key = `endsWith:${suffix}`;
    if (!patternCache.has(key)) {
      patternCache.set(key, new RegExp(`.*/${suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
    }
    return patternCache.get(key)!;
  },
  threePartWithMiddleWild: (part1: string, part3: string): RegExp => {
    const key = `threePart:${part1}:${part3}`;
    if (!patternCache.has(key)) {
      patternCache.set(
        key,
        new RegExp(`^${part1.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/[^/]+/${part3.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
      );
    }
    return patternCache.get(key)!;
  },
};

// Handler Registry
class ActionHandlerRegistry {
  private handlers: ActionHandler[] = [];
  private sagaMiddleware: ReturnType<typeof createSagaMiddleware> | null = null;

  constructor() {
    this.handlers = [];
  }

  setSagaMiddleware(middleware: ReturnType<typeof createSagaMiddleware>) {
    this.sagaMiddleware = middleware;
  }

  register(
    pattern: ActionPattern,
    handler: (action: UnknownAction, store: MiddlewareAPI<any, any>, next: (action: UnknownAction) => any) => any,
    options: { type?: HandlerType; priority?: number; id?: string } = {}
  ): string {
    const id = options.id || `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const type = options.type || "PRE_PROCESS";
    const priority = options.priority || 0;

    const actionHandler: ActionHandler = { pattern, handler, type, priority, id };
    this.handlers.push(actionHandler);
    this.handlers.sort((a, b) => b.priority - a.priority); // Higher priority first
    return id;
  }

  unregister(id: string): boolean {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter((handler) => handler.id !== id);
    return this.handlers.length !== initialLength;
  }

  private matchesPattern(action: UnknownAction, pattern: ActionPattern): boolean {
    if (typeof pattern === "string") {
      return action.type === pattern;
    } else if (pattern instanceof RegExp) {
      return typeof action.type === "string" && pattern.test(action.type);
    } else {
      return pattern(action);
    }
  }

  findMatchingHandlers(action: UnknownAction): ActionHandler[] {
    return this.handlers.filter((handler) => this.matchesPattern(action, handler.pattern));
  }

  *rootSaga(store: MiddlewareAPI<any, any>) {
    for (const handler of this.handlers.filter((h) => h.type === "SIDE_EFFECT" && typeof h.handler === "function")) {
      if (typeof handler.pattern === "string") {
        yield takeEvery(handler.pattern, function* (action: UnknownAction) {
          yield call(handler.handler, action, store, (a: UnknownAction) => a); // Dummy next for SIDE_EFFECT
        });
      } else if (handler.pattern instanceof RegExp) {
        const regexPattern = handler.pattern;
        yield takeEvery(
          (action: UnknownAction) => typeof action.type === "string" && regexPattern.test(action.type),
          function* (action: UnknownAction) {
            yield call(handler.handler, action, store, (a: UnknownAction) => a);
          }
        );
      } else {
        yield takeEvery(handler.pattern, function* (action: UnknownAction) {
          yield call(handler.handler, action, store, (a: UnknownAction) => a);
        });
      }
    }
  }

  runSagas(store: MiddlewareAPI<any, any>) {
    if (this.sagaMiddleware) {
      this.sagaMiddleware.run(this.rootSaga.bind(this), store);
    }
  }
}

export const actionRegistry = new ActionHandlerRegistry();

// Middleware
export const createGatekeeperMiddleware = (): Middleware => {
  const exactMatches = new Set<string>();
  return (store) => (next) => (action: UnknownAction) => {
    if (!("type" in action) || typeof action.type !== "string") {
      return next(action);
    }

    const matchingHandlers = actionRegistry.findMatchingHandlers(action);
    let modifiedAction = action;

    // PRE_PROCESS: Must complete before action proceeds
    for (const handler of matchingHandlers.filter((h) => h.type === "PRE_PROCESS")) {
      handler.handler(action, store, next);
    }

    // TRANSFORM: Modify action before passing to next
    for (const handler of matchingHandlers.filter((h) => h.type === "TRANSFORM")) {
      modifiedAction = handler.handler(action, store, next) || action;
    }

    // Pass action (possibly modified) to the next middleware/reducers
    const result = next(modifiedAction);

    // SIDE_EFFECT: Trigger after action proceeds (async)
    matchingHandlers
      .filter((h) => h.type === "SIDE_EFFECT")
      .forEach((handler) => {
        setTimeout(() => handler.handler(action, store, next), 0);
      });

    // CONTROLLED: Custom logic (e.g., throttle), runs after action
    matchingHandlers
      .filter((h) => h.type === "CONTROLLED")
      .forEach((handler) => handler.handler(action, store, next));

    return result;
  };
};

// Specific Handlers
function* messageFetchSuccessSaga(action: UnknownAction) {
  console.log("Message fetch success saga running", action.payload);
  // Add your side effect logic here
}

actionRegistry.register(
  patternHelpers.exact(getEntitySlice("message").actions.fetchRecordsSuccess.type),
  (action: UnknownAction, store: MiddlewareAPI<any, any>) => {
    store.dispatch({ type: "RUN_SAGA", payload: action }); // Trigger saga indirectly
  },
  { type: "SIDE_EFFECT", id: "messageFetchSuccess" }
);

actionRegistry.register(
  patternHelpers.exact("storage/setStorageState"),
  (action: UnknownAction) => {
    const storage = StorageManager.getInstance();
    if (action.payload) {
      throttledStorageOperations(storage, action.payload as Partial<any>);
    }
    // Original action still proceeds to reducers
  },
  { type: "SIDE_EFFECT", id: "storageSetState" }
);