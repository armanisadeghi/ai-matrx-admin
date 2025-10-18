'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { CockpitControls } from '@/components/playground/types';

interface PageSpecificHeaderProps {
  children: React.ReactNode;
}

export function PageSpecificHeader({ children }: PageSpecificHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const element = document.getElementById('page-specific-header-content');
    setTargetElement(element);
  }, []);

  if (!mounted || !targetElement) {
    return null;
  }

  return createPortal(children, targetElement);
}

interface CockpitHeaderProps {
  cockpitControls: CockpitControls;
}

export function CockpitHeader({ cockpitControls }: CockpitHeaderProps) {
  const pathname = usePathname();
  
  // Only render on cockpit pages
  if (!pathname?.includes('/ai/cockpit')) {
    return null;
  }

  // Dynamically import the component to avoid SSR issues
  const [PlaygroundHeaderAllInOne, setPlaygroundHeaderAllInOne] = useState<any>(null);

  useEffect(() => {
    import('@/components/playground/header/PlaygroundHeaderAllInOne').then((module) => {
      setPlaygroundHeaderAllInOne(() => module.default);
    });
  }, []);

  if (!PlaygroundHeaderAllInOne) {
    return null;
  }

  return (
    <PageSpecificHeader>
      <PlaygroundHeaderAllInOne {...cockpitControls} />
    </PageSpecificHeader>
  );
}

interface PromptHeaderProps {
  promptName: string;
  onPromptNameChange: (value: string) => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  onOpenFullScreenEditor?: () => void;
  onOpenSettings?: () => void;
}

export function PromptHeader(props: PromptHeaderProps) {
  const pathname = usePathname();
  
  // Only render on prompt pages
  if (!pathname?.includes('/ai/prompts')) {
    return null;
  }

  // Dynamically import the component to avoid SSR issues
  const [PromptBuilderHeaderCompact, setPromptBuilderHeaderCompact] = useState<any>(null);

  useEffect(() => {
    import('@/features/prompts/components/PromptBuilderHeaderCompact').then((module) => {
      setPromptBuilderHeaderCompact(() => module.PromptBuilderHeaderCompact);
    });
  }, []);

  if (!PromptBuilderHeaderCompact) {
    return null;
  }

  return (
    <PageSpecificHeader>
      <PromptBuilderHeaderCompact {...props} />
    </PageSpecificHeader>
  );
}
