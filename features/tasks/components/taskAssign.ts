// "Assign to…" for a ticked set of tasks: a person must be PICKED. Nobody is never the default;
// Unassign is its own verb. The button stays off until the people read has answered.

export interface AssignPerson {
  user_id: string;
  display_name?: string | null;
  email?: string | null;
}

export function assignDisabledReason(loading: boolean, people: readonly AssignPerson[]): string | null {
  if (loading) return "Loading people…";
  if (people.length === 0) return "No people to assign to";
  return null;
}

export function assignAsk(people: readonly AssignPerson[]) {
  return {
    kind: "choice" as const,
    label: "Assign to",
    options: people.map((p) => ({ value: p.user_id, label: p.display_name || p.email || p.user_id })),
    // No default: a person must be picked before Assign enables.
    defaultValue: "",
  };
}
