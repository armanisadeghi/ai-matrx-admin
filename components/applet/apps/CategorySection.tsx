// components/apps/CategorySection.tsx
import Link from 'next/link';
import { CategorySlug } from '@/config/applets/apps/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CategorySectionProps {
  categorySlug: CategorySlug;
  categoryLabel: string;
  subcategories: Array<{
    label: string;
    slug: string;
  }>;
}

export function CategorySection({ 
  categorySlug, 
  categoryLabel, 
  subcategories 
}: CategorySectionProps) {
  // Take first 4 subcategories for preview
  const previewSubcategories = subcategories.slice(0, 4);
  
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {categoryLabel}
        </h2>
        <Link 
          href={`/apps/${categorySlug}`}
          className="text-sm text-muted-foreground hover:text-primary"
        >
          View category →
        </Link>
      </div>
      
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="text-xl">{categoryLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {previewSubcategories.map((subcategory) => (
                <div 
                  key={subcategory.slug}
                  className="text-sm text-muted-foreground"
                >
                  • {subcategory.label}
                </div>
              ))}
            </div>
            {subcategories.length > 4 && (
              <div className="text-sm text-muted-foreground">
                And {subcategories.length - 4} more subcategories...
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}