'use client';

import Link from 'next/link';
import GroupBuilder from '@/features/applet/builder/modules/GroupBuilder';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function GroupBuilderPage() {
  return (
    <div className="py-4">
      <div className="mb-4 mx-4">
        <Link href="/apps/builder/hub">
          <Button variant="ghost" size="sm" className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Builder Hub</span>
          </Button>
        </Link>
      </div>
      <GroupBuilder />
    </div>
  );
} 