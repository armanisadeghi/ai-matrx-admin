'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { PromptBuiltinsManager } from '@/features/prompt-builtins/admin/PromptBuiltinsManager';

export default function CategoriesAndShortcutsPage() {
  return (
    <div className="flex flex-col h-full">
      <Link
        href="/administration/agent-shortcuts"
        className="group flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-primary/30 bg-primary/10 hover:bg-primary/15 transition-colors"
      >
        <div className="h-7 w-7 rounded-md bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0 text-sm">
          <span className="font-medium text-foreground">New home:</span>{' '}
          <span className="text-muted-foreground">
            Agent Shortcuts are now managed at{' '}
          </span>
          <span className="font-mono text-xs text-foreground">
            /administration/agent-shortcuts
          </span>
          <span className="text-muted-foreground">
            . This page is kept during the migration and will be removed in
            Phase 16.
          </span>
        </div>
        <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
      </Link>
      <div className="flex-1 overflow-hidden">
        <PromptBuiltinsManager />
      </div>
    </div>
  );
}
