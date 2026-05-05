'use client';
import React from 'react';
import { FullPageImageSearch } from './FullPageImageSearch';
import { PublicImageSearch } from '@/components/official/PublicImageSearch';
import { cn } from '@/lib/utils';
import type { ImageSurface } from '../../types';

interface ImageSearchProps {
  surface?: ImageSurface;
  className?: string;
  onSelect?: (urls: string | string[]) => void;
}

export function ImageSearch({ surface = 'page', className, onSelect }: ImageSearchProps) {
  if (surface === 'page') {
    return <FullPageImageSearch />;
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      <PublicImageSearch onSelect={onSelect ?? (() => {})} />
    </div>
  );
}
