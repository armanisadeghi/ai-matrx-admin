// app/(authenticated)/tests/ssr-test/[category]/layout.tsx
import React from 'react';
import { OptionCardHeader } from '@/components/ssr';
import { getCategories } from '../constants';
import { notFound } from 'next/navigation';

interface LayoutProps {
    children: React.ReactNode;
    params: {
        category: string;
    };
}

export default async function CategoryLayout({ children, params }: LayoutProps) {
    const resolvedParams = await params;

    console.log('Layout Params:', resolvedParams);


    const categories = await getCategories();
    const category = categories[resolvedParams.category];

    if (!category) {
        notFound();
    }

    const headerData = {
        id: category.id,
        displayName: category.label,
        description: category.description,
        icon: category.icon,
        additionalFields: {
            'Style': category.backgroundColor
        }
    };

    return (
        <div className="flex flex-col space-y-6">
            <OptionCardHeader data={headerData} />
            {children}
        </div>
    );
}
