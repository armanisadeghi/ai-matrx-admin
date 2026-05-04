import React from 'react';
import { ImagesSidebar } from '@/features/images/components/ImagesSidebar';
import { createRouteMetadata } from '@/utils/route-metadata';

export const metadata = createRouteMetadata('/images', {
  title: 'Images',
  description: 'Browse, manage, and edit your images',
});

export default function ImagesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-page flex bg-textured overflow-hidden">
      <ImagesSidebar />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
