'use client';

import { ConsolidatedSystemPromptsManager } from '@/components/admin/ConsolidatedSystemPromptsManager';

/**
 * Functionality Configs Page (now redirects to consolidated manager)
 * 
 * Previously managed functionality configs separately.
 * Now uses the unified AI Tools Manager that handles both
 * functionalities and their prompt connections in one place.
 */
export default function FunctionalityConfigsPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <ConsolidatedSystemPromptsManager />
    </div>
  );
}

