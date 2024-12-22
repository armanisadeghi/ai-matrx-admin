// iconLoader.ts
export async function loadIcon(iconInfo: { type: string; import: string }) {
    try {
        if (iconInfo.type === 'lucide') {
            // Import directly from the package root
            const icon = await import(`lucide-react/dist/${iconInfo.import}`);
            return icon.default;
        }
        if (iconInfo.type === 'tabler') {
            // Import directly from the package root
            const icon = await import(`@tabler/icons-react/${iconInfo.import}`);
            return icon.default;
        }
        throw new Error(`Unknown icon type: ${iconInfo.type}`);
    } catch (error) {
        console.error(`Failed to load icon: ${iconInfo.import}`, error);
        return null;
    }
}