// app/(authenticated)/flashcards/[id]/layout.tsx
import React from 'react';
import { OptionCardHeader, OptionCardGrid } from '@/components/ssr';
import { getCategories, getDataByCategory, base_app_path } from '../../constants';

export default async function Layout({ children, params }) {
    return (
            <div className="flex-1">
                {children}
            </div>
    );
}