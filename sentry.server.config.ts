import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Server-side: higher sample rate since volume is lower
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Only enable in production and staging
  enabled: process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_ENV === "staging",
});
