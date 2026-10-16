/**
 * The name fired (through `@ai-matrx/kit/invalidation`) when WHO is signed in
 * changes in this tab — sign-out, or a different person signing in. Each
 * Content-IR registry registers on it at its own module init and reloads only
 * when it has been demanded, so the previous person's private schemas and
 * components never outlive their session and a tab that never drew a kind
 * fetches nothing (THE ZERO-PREFETCH LAW).
 *
 * The inversion keeps the auth watcher — mounted on every route — free of any
 * import edge into the registry cluster (the D115 shape: an `import()` from a
 * ubiquitous module into a cycle-carrying mega-cluster). This module must
 * never grow an import.
 */
export const CONTENT_IR_IDENTITY_FLUSH = "content-ir:identity-flush";
