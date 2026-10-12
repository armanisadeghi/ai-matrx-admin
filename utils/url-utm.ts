/**
 * Retired: outbound referral data lives in `@ai-matrx/kit/outbound` (withReferral / stripReferral),
 * the one door with the one knob. These names remain only until the Smart Add lane's in-flight
 * file (features/marketing/smart-add/SmartAddExtras.tsx) moves to `withReferral`; then delete this file.
 */
export { withReferral as addUtmSource, stripReferral as stripOwnUtmSource } from "@ai-matrx/kit/outbound";
