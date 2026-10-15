/** What an agent on a computer needs before it saves (Runs on › Run an agent on this computer). Pure. */
export function computerAgentErrors(f: { title: string; prompt: string; agentId: string | null | undefined; triggerType: string }): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!f.title.trim()) errs.title = "Name the schedule";
  if (!f.agentId) errs.agentId = "Select the agent";
  if (!f.prompt.trim()) errs.prompt = "Say what the agent should do";
  if (!["interval", "cron", "one-shot"].includes(f.triggerType)) errs.trigger = "On a computer, a schedule runs on a time: every N, a cron, or once";
  return errs;
}
