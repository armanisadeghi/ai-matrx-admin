// iconLoader.ts
export async function loadIcon(iconInfo: { type: string; import: string }) {
    try {
        if (iconInfo.type === 'lucide') {
            // Dynamically import only the specific icon needed
            const icon = await import(`lucide-react/dist/esm/icons/${iconInfo.import}`);
            return icon.default;
        }
        if (iconInfo.type === 'tabler') {
            // For Tabler icons, assuming similar structure
            const icon = await import(`@tabler/icons-react/dist/esm/${iconInfo.import}`);
            return icon.default;
        }
        throw new Error(`Unknown icon type: ${iconInfo.type}`);
    } catch (error) {
        console.error(`Failed to load icon: ${iconInfo.import}`, error);
        return null;
    }
}