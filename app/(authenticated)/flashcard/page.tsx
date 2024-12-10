// app/(authenticated)/tests/ssr-test/page.tsx
import React from 'react';
import { OptionCardGrid } from '@/components/ssr';
import { getCategoriesArray, base_app_path } from './constants';

export default async function SSRTestPage() {
    const categories = await getCategoriesArray();

    const items = categories.map(category => ({
        id: category.id,
        displayName: category.label,
        description: category.description,
        icon: category.icon,
        additionalFields: {
            'Style': category.customStyles.backgroundColor
        }
    }));

    return <OptionCardGrid items={items} basePath={base_app_path} />;
}
