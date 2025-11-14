'use client';

import { SystemPromptCategoriesManager } from '@/components/admin/SystemPromptCategoriesManager';

export default function SystemPromptCategoriesPage() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="py-4 bg-neutral-100 dark:bg-neutral-900 w-full">
        <div className="w-full px-4">
          <SystemPromptCategoriesManager />
        </div>
      </div>
    </div>
  );
}

