import { AppletConfig } from "@/types/applets/types";

// components/applet/applets/layouts/GridLayout.tsx
export function GridLayout({ config }: { config: AppletConfig }) {
    return (
        <div className="container py-8">
            <h1 className="text-2xl font-bold">{config.title}</h1>
            <p>Grid layout coming soon...</p>
        </div>
    );
}

