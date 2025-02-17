// components/apps/AppGrid.tsx
import { CategorySlug, SubcategorySlug } from '@/config/applets/apps/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface App {
    id: string;
    title: string;
    description: string;
    // Add other app properties as needed
}

interface AppGridProps {
    apps: App[];
    categorySlug: CategorySlug;
    subcategorySlug: SubcategorySlug;
}

export function AppGrid({ apps, categorySlug, subcategorySlug }: AppGridProps) {
    if (!apps.length) {
        return (
            <div className="text-center py-6 text-muted-foreground">
                No apps found in this subcategory
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app) => (
                <Link 
                    key={app.id}
                    href={`/apps/${categorySlug}/${subcategorySlug}/${app.id}`}
                    className="block hover:no-underline"
                >
                    <Card className="h-full hover:shadow-md transition-shadow">
                        <CardHeader>
                            <CardTitle className="line-clamp-1">
                                {app.title}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground line-clamp-2">
                                {app.description}
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}