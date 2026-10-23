/**
 * The redaction pattern list as the Redact tool shows it: a NAME for every id ("US Social Security Number",
 * never `ssn_us`). The catalog endpoint names each pattern in `description`; a pattern with no words at all gets
 * its id spelled out ("credit_card" -> "Credit card"), so a raw id is never what a person reads.
 */
export interface RedactPatternOption {
  id: string;
  label: string;
}

function spelled(id: string): string {
  const words = id.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : id;
}

export function redactPatternOptions(catalog: unknown): RedactPatternOption[] {
  const list = Array.isArray(catalog) ? catalog : ((catalog as { patterns?: unknown[] } | null)?.patterns ?? []);
  return (list as Array<{ id?: string; label?: string; name?: string; description?: string }>).flatMap((p) => {
    if (typeof p.id !== "string") return [];
    const named = [p.label, p.name, p.description].find((t) => typeof t === "string" && t.trim() && t.trim() !== p.id);
    return [{ id: p.id, label: (named as string | undefined)?.trim() ?? spelled(p.id) }];
  });
}
