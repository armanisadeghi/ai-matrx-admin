// app/apps/page.tsx
import { CategorySection } from '@/components/applet/apps/CategorySection';
import { APP_CATEGORIES } from '@/config/applets/apps/constants';

export default function AppsPage() {
  return (
    <div className="space-y-8">
      {Object.entries(APP_CATEGORIES).map(([slug, category]) => (
        <CategorySection
          key={slug}
          categorySlug={slug}
          categoryLabel={category.label}
          subcategories={Object.values(category.subcategories)}
        />
      ))}
    </div>
  );
}
