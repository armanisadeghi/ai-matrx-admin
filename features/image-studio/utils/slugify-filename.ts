/** Lowercase, dash-separated filename base stripped of the extension. */
export function slugifyFilename(raw: string): string {
    const stripped = raw.replace(/\.[^.]+$/, "");
    return (
        stripped
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "image"
    );
}
