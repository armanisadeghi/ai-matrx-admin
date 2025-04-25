// app/(authenticated)/dashboard/preferences/page.tsx
'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import PreferencesPage from '@/components/user-preferences/PreferencesPage';
import UnderConstructionBanner from '@/components/ui/UnderConstructionBanner';

export default function Preferences() {
    return (
        <div className="container mx-auto p-6">
            <Link href="/dashboard" className="flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-6">
                <ArrowLeft size={16} className="mr-2" />
                <span>Back to Dashboard</span>
            </Link>

            <UnderConstructionBanner title="Preferences Preview" message="The preferences system is currently in development. Settings changes may not be saved at this time. Definitely Arman's fault." />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Preferences</h1>
                <p className="text-gray-500 dark:text-gray-400">Customize your app experience</p>
            </div>
            
            <PreferencesPage />
        </div>
    );
}