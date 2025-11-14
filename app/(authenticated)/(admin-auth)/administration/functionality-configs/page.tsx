'use client';

import { FunctionalityConfigsManager } from '@/components/admin/FunctionalityConfigsManager';

export default function FunctionalityConfigsPage() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="py-4 bg-neutral-100 dark:bg-neutral-900 w-full">
        <div className="w-full px-4">
          <FunctionalityConfigsManager />
        </div>
      </div>
    </div>
  );
}

