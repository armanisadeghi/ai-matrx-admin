// features/rich-document/actions/handlers/feedback.ts
//
// Thumbs are @ai-matrx/chat's rows (message-actions W2b). They write the ONE destination,
// `platform.output_feedback` (lib/output-feedback/FEATURE.md), through THIS app's verdict store,
// registered here, so every bar showing the same subject stays in sync (the chat footer's
// Rulebook nudge reads the same store).

import { registerMessageActionFeedbackStore } from "@ai-matrx/chat/agents/components/messages-display/rich-document/actions/output-feedback";
import { peekOutputFeedback, subscribeOutputFeedback } from "@/lib/output-feedback/store";
import { loadOutputFeedback } from "@/lib/output-feedback/batchLoader";

registerMessageActionFeedbackStore({
  peek: (subject) => peekOutputFeedback(subject),
  subscribe: (listener) => subscribeOutputFeedback(listener),
  load: (subject) => loadOutputFeedback(subject.subjectType, subject.subjectId),
  toggle: async (subject, verdict, extras) => {
    // The toggle drags the service: load it at click time.
    const { toggleOutputFeedbackVerdict } = await import("@/lib/output-feedback/verdict");
    return toggleOutputFeedbackVerdict(subject, verdict, extras);
  },
});
