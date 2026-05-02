/**
 * @deprecated Use `ProTextarea` from `@/components/official/ProTextarea`.
 *
 * This file remains as a backwards-compatibility shim so existing imports
 * (`VoiceTextarea`, `VoiceTextareaProps`, `VoiceTextareaElement`) continue to
 * work. The implementation moved to `ProTextarea.tsx` because the component
 * has grown well beyond just voice — it's now the canonical full-feature
 * textarea (voice, copy, submit, auto-grow, recording protection).
 *
 * New code should import directly from `ProTextarea`. When all consumers have
 * been updated, this file can be deleted.
 */

export {
  ProTextarea as VoiceTextarea,
  type ProTextareaProps as VoiceTextareaProps,
  type ProTextareaElement as VoiceTextareaElement,
} from "./ProTextarea";
