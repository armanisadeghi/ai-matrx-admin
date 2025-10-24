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

interface ChatHeaderProps {
  baseRoute?: string;
}

export function ChatHeader({ baseRoute = "/chat" }: ChatHeaderProps) {
  const pathname = usePathname();
  
  // Only render on chat pages
  if (!pathname?.includes('/chat')) {
    return null;
  }

  // Dynamically import the component to avoid SSR issues
  const [ChatHeaderCompact, setChatHeaderCompact] = useState<any>(null);

  useEffect(() => {
    import('@/features/chat/components/header/ChatHeaderCompact').then((module) => {
      setChatHeaderCompact(() => module.ChatHeaderCompact);
    });
  }, []);

  if (!ChatHeaderCompact) {
    return null;
  }

  return (
    <PageSpecificHeader>
      <ChatHeaderCompact baseRoute={baseRoute} />
    </PageSpecificHeader>
  );
}

interface AppletHeaderProps {
  appId?: string;
  isDemo?: boolean;
  isDebug?: boolean;
  activeAppletSlug?: string;
  isCreator?: boolean;
  isAdmin?: boolean;
  isPreview?: boolean;
}

export function AppletHeader(props: AppletHeaderProps) {
  const pathname = usePathname();
  
  // Only render on custom app pages
  if (!pathname?.includes('/apps/custom/')) {
    return null;
  }

  // Dynamically import the component to avoid SSR issues
  const [AppletHeaderCompact, setAppletHeaderCompact] = useState<any>(null);

  useEffect(() => {
    import('@/features/applet/runner/header/AppletHeaderCompact').then((module) => {
      setAppletHeaderCompact(() => module.AppletHeaderCompact);
    });
  }, []);

  if (!AppletHeaderCompact) {
    return null;
  }

  return (
    <PageSpecificHeader>
      <AppletHeaderCompact {...props} />
    </PageSpecificHeader>
  );
}

interface ModuleHeaderProps {
  pages: Array<{
    title: string;
    path: string;
    relative: boolean;
    description: string;
    icon?: React.ReactNode;
    color?: string;
    layout?: string;
  }>;
  currentPath: string;
  moduleHome: string;
  moduleName?: string;
  className?: string;
}

export function ModuleHeader(props: ModuleHeaderProps) {
  // Dynamically import the component to avoid SSR issues
  const [ResponsiveModuleHeaderContent, setResponsiveModuleHeaderContent] = useState<any>(null);

  useEffect(() => {
    import('@/components/matrx/navigation/ResponsiveModuleHeaderContent').then((module) => {
      setResponsiveModuleHeaderContent(() => module.default);
    });
  }, []);

  if (!ResponsiveModuleHeaderContent) {
    return null;
  }

  return (
    <PageSpecificHeader>
      <ResponsiveModuleHeaderContent {...props} />
    </PageSpecificHeader>
  );
}