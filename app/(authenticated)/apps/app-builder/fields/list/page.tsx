'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

const builderCards = [
  {
    title: 'Fields',
    description: 'Build and manage reusable form fields for your applications',
    link: '/apps/app-builder/fields',
    icon: 'input-field'
  },
  {
    title: 'Containers',
    description: 'Create groups of fields and organize them into containers',
    link: '/apps/app-builder/containers',
    icon: 'section'
  },
  {
    title: 'Applets',
    description: 'Design functional components that connect to data and services',
    link: '/apps/app-builder/applets',
    icon: 'applet'
  },
  {
    title: 'Apps',
    description: 'Combine applets into complete applications for your users',
    link: '/apps/app-builder/apps',
    icon: 'application'
  }
];

export default function AppBuilderPage() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Application Builder Overview</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Welcome to the Application Builder. Select a component type to start building your application.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {builderCards.map(card => (
          <Link href={card.link} key={card.title}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>{card.title}</CardTitle>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Placeholder for future content/stats */}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
} 