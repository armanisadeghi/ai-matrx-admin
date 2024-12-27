// lib/logger/redux-middleware.ts
import { Middleware } from "redux";
import { BaseLogger } from "./base-logger";
import { ReduxLog } from "./types";
import { logConfig } from "./config";
import { v4 as uuidv4 } from "uuid";
import { emitLog } from "./components/ReduxLogger";

interface ReduxAction {
  type: string;
  payload?: unknown;
  result?: unknown;
  error?: unknown;
}

class ReduxLogger extends BaseLogger {
  private static instance: ReduxLogger;

  private constructor() {
    super("redux-logger");
  }

  static getInstance(): ReduxLogger {
    if (!ReduxLogger.instance) {
      ReduxLogger.instance = new ReduxLogger();
    }
    return ReduxLogger.instance;
  }

  logAction(action: ReduxAction, prevState: unknown, nextState: unknown): void {
    const log: ReduxLog = {
      id: uuidv4(),
      category: "redux",
      level: "error",
      message: `Redux Action: ${action.type}`,
      action: {
        type: action.type,
        payload: action.payload,
      },
      prevState,
      nextState,
      context: {
        timestamp: new Date().toISOString(),
        environment: logConfig.environment,
        action: action.type,
      },
    };

    // Emit log to viewer
    emitLog(log);

    this.addLog(log);
    this.consoleOutput(log);
    this.processLog(log);
  }
}

const reduxLogger = ReduxLogger.getInstance();

// List of prefixes to exclude (case-insensitive)
const excludedPrefixes = ["socket", "theme", "entity", 'userPreferences'];

export const loggerMiddleware: Middleware =
  (store) => (next) => async (action: ReduxAction) => {
    const prevState = store.getState();
    let result;
    let error = null;

    // Check if the action type starts with any excluded prefix (case-insensitive)
    const shouldExclude = excludedPrefixes.some((prefix) =>
      action.type.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (shouldExclude) {
      return next(action); // Skip logging and proceed with the action
    }

    try {
      // Process the action and capture its result
      result = await next(action);
    } catch (err) {
      // Capture errors for logging
      error = err;
    }

    const nextState = store.getState();

    // Extract the slice name (assuming action.type is in the format 'sliceName/actionName')
    const sliceName = action.type.split('/')[0];

    // Extract only the affected slice's state
    const prevSliceState = prevState[sliceName];
    const nextSliceState = nextState[sliceName];

    reduxLogger.logAction(
      {
        type: action.type,
        payload: action.payload,
        result,
        error,
      },
      prevSliceState,
      nextSliceState
    );

    if (error) {
      throw error; // Rethrow the error for Redux to handle
    }

    return result;
  };

export const logInlineAction = (
  message: string,
  context: any = {}
) => {
  const log: ReduxLog = {
    id: uuidv4(),
    category: 'redux',
    level: 'info',
    message,
    action: null,
    prevState: null,
    nextState: null,
    context: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      ...context,
    },
  };

  emitLog(log);
};
