import { createSystemAgentFromSeed } from "@/lib/agents/actions";
import { BLANK_AGENT_SEED } from "@ai-matrx/chat/agents/constants/blank-agent";

export const metadata = { title: "New System Agent | Admin" };

// The system agent row is created on submit, never on page load: a visit,
// reload or back-button must not insert a blank "Untitled Agent".
export default function NewManualSystemAgentPage() {
  async function create(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    await createSystemAgentFromSeed({
      ...BLANK_AGENT_SEED,
      name: name || BLANK_AGENT_SEED.name,
    });
  }

  return (
    <div className="flex h-full items-start justify-center p-6">
      <form action={create} className="w-full max-w-xl space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-system-agent-name" className="type-label text-foreground">
            Name
          </label>
          <input
            id="new-system-agent-name"
            name="name"
            placeholder="Untitled Agent"
            autoFocus
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Create system agent
        </button>
      </form>
    </div>
  );
}
