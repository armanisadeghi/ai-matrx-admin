import React from 'react';
import { createRouteMetadata } from '@/utils/route-metadata';
import { ClientAdminLayout } from './ClientAdminLayout';

export const metadata = createRouteMetadata('/administration', {
  title: 'Administration | AI Matrx',
  description: 'Administrative tools and system management',
  additionalMetadata: {
    keywords: ['administration', 'admin', 'system management', 'database', 'settings'],
    openGraph: {
      title: 'Administration | AI Matrx',
      description: 'Administrative tools and system management',
      type: 'website',
    },
  },
});

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientAdminLayout>{children}</ClientAdminLayout>;
}
