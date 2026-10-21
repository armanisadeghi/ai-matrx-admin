/**
 * A `download` request leaves the frame with its text content as a Blob. The
 * frame → host message cap is 64 KB of JSON, and a Blob measures as `{}` and
 * crosses the port as a structured clone — so a shape can export a large CSV
 * or Markdown file it built itself. Every other action's input is untouched.
 */
export function toActionWire(key: string, input: unknown): unknown {
    if (key !== "download" || !input || typeof input !== "object") return input;
    const obj = input as Record<string, unknown>;
    if (typeof obj.content !== "string") return input;
    const mime = typeof obj.mime === "string" ? obj.mime : "text/plain";
    return { ...obj, content: new Blob([obj.content], { type: mime }) };
}
