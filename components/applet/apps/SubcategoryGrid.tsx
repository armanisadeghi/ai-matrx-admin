// components/apps/SubcategoryGrid.tsx
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategorySlug, SubcategorySlug } from '@/config/applets/apps/constants';

interface App {
  id: string;
  title: string;
  description: string;
}

interface SubcategoryGridProps {
  categorySlug: CategorySlug;
  subcategories: Array<{
    label: string;
    slug: SubcategorySlug;
    featuredApps?: App[];
  }>;
}

export function SubcategoryGrid({ categorySlug, subcategories }: SubcategoryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subcategories.map((subcategory) => (
        <Link 
          key={subcategory.slug}
          href={`/apps/${categorySlug}/${subcategory.slug}`}
          className="block hover:no-underline"
        >
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">{subcategory.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {subcategory.featuredApps && subcategory.featuredApps.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Featured Apps:</div>
                  {subcategory.featuredApps.slice(0, 3).map((app) => (
                    <div key={app.id} className="text-sm text-muted-foreground">
                      • {app.title}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Browse apps in this category
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}