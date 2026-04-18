/**
 * LoggerLike — structural match for console's method set used by the package.
 *
 * Consumers can pass `console` directly or inject a production logger
 * (Sentry, Pino, Winston) that implements the same surface. Defaults to
 * `console` when `configure()` omits a logger.
 */

export interface LoggerLike {
  log(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug?(message: string, ...args: unknown[]): void;
}
