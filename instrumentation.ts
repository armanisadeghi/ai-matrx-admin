/**
 * Next.js instrumentation hook — runs once on server startup.
 * Initializes Sentry for server-side error tracking and performance tracing.
 *
 * This file is automatically detected by Next.js when placed at the project root.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

export { onRequestError } from '@sentry/nextjs';
