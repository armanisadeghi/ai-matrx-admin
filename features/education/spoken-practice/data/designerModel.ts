// features/education/spoken-practice/data/designerModel.ts
//
// The model the session designer actually runs on, so the server can resolve the
// chosen Sources inside THAT model's real context window (`target_model_id` on the
// Source set: the same budget the "Review what goes in" page judges against). The
// mandate resolves live to whatever agent the database binds, and the agent
// carries the model, so neither is named in code. Unknown is `undefined` — the
// server then applies no model budget and nothing is cut in the browser.

import { resolveMandate } from "@ai-matrx/chat/mandates/service";
import { supabase } from "@ai-matrx/chat/host/db";
import { SPOKEN_PRACTICE_MANDATES } from "../mandates";
import type { SpokenPracticeMode } from "../types";

export function designerMandateKey(mode: SpokenPracticeMode) {
  return mode === "pronunciation"
    ? SPOKEN_PRACTICE_MANDATES.designLanguageSession
    : SPOKEN_PRACTICE_MANDATES.designSession;
}

/** The designer agent's model id, or undefined when it cannot be read. Never throws. */
export async function practiceDesignerModelId(mode: SpokenPracticeMode): Promise<string | undefined> {
  try {
    const { agentId } = await resolveMandate(designerMandateKey(mode));
    const { data } = await supabase
      .schema("agent")
      .from("definition")
      .select("model_id")
      .eq("id", agentId)
      .maybeSingle();
    return data?.model_id ?? undefined;
  } catch {
    return undefined;
  }
}
