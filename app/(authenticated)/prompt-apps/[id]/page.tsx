'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the editor component with SSR disabled to avoid Redux initialization issues
const PromptAppEditorClient = dynamic(
  () => import('./PromptAppEditorClient').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-page flex items-center justify-center bg-textured">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
);

export default function PromptAppPage() {
  return <PromptAppEditorClient />;
}

