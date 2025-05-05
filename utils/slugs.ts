export const generateSlug = (name: string): string => {
    if (!name) return "";
    return name
        .toLowerCase()
        .replace(/([a-z])([A-Z])/g, "$1-$2") // Convert camelCase to kebab
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/[^a-z0-9-]/g, ""); // Remove special characters
};
