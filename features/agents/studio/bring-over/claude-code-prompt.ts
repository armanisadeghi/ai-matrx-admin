/**
 * Mode "Build it with Claude Code": the prompt the person gives Claude Code. It connects Claude Code to
 * AI Matrx (the plugin's own install steps), then runs the plugin skill that sends ONE evidence bundle
 * (`export-agent-to-ai-matrx`). Claude never writes the agent: the Agent Factory does, from the bundle.
 */
export function claudeCodePrompt(job: string): string {
  const lines = [
    "I want to turn the work you and I do together into an agent on AI Matrx. Please do these in order.",
    "",
    "1. Check that you have the AI Matrx connection: an `agent_author` tool from the `aidream` MCP server. If you do not, install the AI Matrx plugin: run `/plugin marketplace add AI-Matrix-Engine/matrx-claude-plugin`, then `/plugin install matrx@matrx`, then `/matrx:login` so I can sign in, and restart this session if it asks.",
    "2. Run the `export-agent-to-ai-matrx` skill (`/matrx:export-agent-to-ai-matrx`). It gathers what defines the job (the CLAUDE.md lines that apply, the SKILL.md files this job uses, and 2 to 3 real examples of an input and the result I accepted), shows me a summary to approve, and sends it to AI Matrx as one bundle.",
    "3. Give me the link it returns, then stop. Do not write or build the agent yourself: AI Matrx builds it from what you sent.",
  ];
  const what = job.trim();
  if (what) lines.push("", `What the agent should do: ${what}`);
  return lines.join("\n");
}
