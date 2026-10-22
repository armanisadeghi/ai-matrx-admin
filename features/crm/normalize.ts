/**
 * Canonical contact-value normalization. The ONE implementation is the chat package's
 * (`@ai-matrx/chat/window-panels/windows/crm/contact-selection`, shared with Save as contact on every
 * host); this module re-exports it so every existing importer is unchanged.
 *
 * Split out of `service.ts` (which it is re-exported from, so every existing
 * importer is unchanged) purely so it can be imported by code that must not
 * pull in the Supabase client: the selection parser, and its tests.
 *
 * Server twin: aidream `services/crm/canonicalize.py`. The two must stay
 * byte-identical in semantics — drift here is a duplicate factory.
 */

export { normalizeMediumValue } from "@ai-matrx/chat/window-panels/windows/crm/contact-selection";
