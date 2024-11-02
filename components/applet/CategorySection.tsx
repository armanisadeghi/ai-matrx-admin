// components/applets/CategorySection.tsx
import {AppletGrid} from "@/components/applet/AppletGrid";
import { AppletCategory, AppletDefinition } from "@/types/applets/applet-config";
import Link from 'next/link';

interface CategorySectionProps {
    category: AppletCategory;
    applets: AppletDefinition[];
}

export function CategorySection({ category, applets }: CategorySectionProps) {
    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{category}</h2>
                <Link href={`/applets/categories/${category.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-primary">
                    View all →
                </Link>
            </div>
            <AppletGrid applets={applets} category={category} />
        </section>
    );
}
