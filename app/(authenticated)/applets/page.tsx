// app/(authenticated)/applets/page.tsx
import {CategorySection} from "@/components/applet/CategorySection";
import {appletDefinitions} from "@/config/applets/applet-definitions";
import { AppletCategory } from "@/types/applets/types";

const categories: AppletCategory[] = [
    "AI",
    "Automation",
    "Data Management",
    "Content",
    "Media",
    "Productivity",
    "Learning",
    "Business",
    "Development",
    "Utilities",
    "Education",
    "Communication",
];


export default function AppletsPage() {
    return (
        <div className="container py-8 space-y-8">
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Applets</h1>
                <p className="text-xl text-muted-foreground">
                    Discover and launch powerful tools and integrations
                </p>
            </div>

            {categories.map(category => {
                const categoryApplets = appletDefinitions.filter(
                    applet => applet.category === category
                );

                if (categoryApplets.length === 0) return null;

                return (
                    <CategorySection
                        key={category}
                        category={category}
                        applets={categoryApplets}
                    />
                );
            })}
        </div>
    );
}
