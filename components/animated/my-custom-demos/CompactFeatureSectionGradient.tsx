import React from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";

interface CategoryItem {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    link: string;
}

interface TransformedCategory {
    key: string;
    title: string;
    description: string;
    link: string;
    icon: LucideIcon;
    items: CategoryItem[];
}

const CompactFeatureItem = ({ 
    title, 
    icon: Icon, 
    link 
}: Pick<CategoryItem, 'title' | 'icon' | 'link'>) => {
    return (
        <Link
            href={link}
            className={cn(
                "group flex items-center gap-3 p-2.5 transition-all duration-200",
                "border-b last:border-b-0 border-r last:border-r-0",
                "border-neutral-200 dark:border-neutral-800"
            )}
        >
            <Icon className="w-4 h-4 text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            <span className="font-medium text-sm text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {title}
            </span>
        </Link>
    );
};

const ViewAllItem = ({ link }: { link: string }) => {
    return (
        <Link
            href={link}
            className={cn(
                "group flex items-center justify-center gap-2 p-2.5 transition-all duration-200",
                "border-neutral-200 dark:border-neutral-800"
            )}
        >
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                View All
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-500" />
        </Link>
    );
};

interface CompactFeatureSectionGradientProps extends TransformedCategory {
    className?: string;
}

export const CompactFeatureSectionGradient: React.FC<CompactFeatureSectionGradientProps> = ({ 
    title, 
    description, 
    icon: CategoryIcon, 
    items, 
    link,
    className 
}) => {
    // Take only the first 3 items to leave space for the "View All" button
    const displayItems = items.slice(0, 4);
    
    return (
        <section className={cn("space-y-3", className)}>
            <Link href={link} className="group block space-y-2">
                <div className="flex items-center gap-2">
                    {CategoryIcon && (
                        <CategoryIcon className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
                    )}
                    <h2 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                        {title}
                    </h2>
                </div>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 md:grid-cols-5 rounded-lg overflow-hidden">
                {displayItems.map((item) => (
                    <CompactFeatureItem
                        key={item.id}
                        title={item.title}
                        icon={item.icon}
                        link={item.link}
                    />
                ))}
                <ViewAllItem link={link} />
            </div>
        </section>
    );
};

export default CompactFeatureSectionGradient;