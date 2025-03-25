// lib/redux/middleware/gatekeeperMiddleware.ts
import { Middleware } from "@reduxjs/toolkit";
import { UnknownAction } from "redux";

type ActionHandler = (store: any, action: UnknownAction) => UnknownAction | undefined;
type ActionMatcher = (action: UnknownAction) => boolean;

interface HandlerConfig {
  matcher: ActionMatcher;
  handler: ActionHandler;
  isBlocking: boolean;
}

const handlerRegistry = new Map<string, HandlerConfig>();

export const registerHandler = (
  id: string,
  matcher: ActionMatcher,
  handler: ActionHandler,
  isBlocking: boolean = false
) => {
  handlerRegistry.set(id, { matcher, handler, isBlocking });
};

export const gatekeeperMiddleware: Middleware = (store) => (next) => (action: UnknownAction) => {
  if (!("type" in action) || typeof action.type !== "string") {
    return next(action);
  }

  let result = action;
  const nonBlockingTriggers: ActionHandler[] = [];

  for (const [, config] of handlerRegistry) {
    if (config.matcher(action)) {
      if (config.isBlocking) {
        const handlerResult = config.handler(store, action);
        if (handlerResult !== undefined) {
          result = handlerResult;
        }
      } else {
        nonBlockingTriggers.push(config.handler);
      }
    }
  }

  const finalResult = next(result);

  for (const trigger of nonBlockingTriggers) {
    trigger(store, action);
  }

  return finalResult;
};