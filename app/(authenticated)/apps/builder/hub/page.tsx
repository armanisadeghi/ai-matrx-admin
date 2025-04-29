'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppWindow, Box, Layers, Database, FileText, Settings2, PanelLeft } from "lucide-react";

const BuilderHub = () => {
  const builderModules = [
    {
      id: 'apps',
      title: 'Apps',
      description: 'Create and manage your applications',
      icon: <AppWindow className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />,
      href: '/apps/builder/modules/app'
    },
    {
      id: 'applets',
      title: 'Applets',
      description: 'Build reusable applet components',
      icon: <Box className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />,
      href: '/apps/builder/modules/applet'
    },
    {
      id: 'groups',
      title: 'Broker Groups',
      description: 'Create reusable field groups',
      icon: <Layers className="h-8 w-8 text-amber-500 dark:text-amber-400" />,
      href: '/apps/builder/modules/group'
    },
    {
      id: 'fields',
      title: 'Broker Fields',
      description: 'Design individual input fields',
      icon: <FileText className="h-8 w-8 text-rose-500 dark:text-rose-400" />,
      href: '/apps/builder/modules/field'
    },
    {
      id: 'library',
      title: 'Component Library',
      description: 'Browse, import and export components',
      icon: <Database className="h-8 w-8 text-blue-500 dark:text-blue-400" />,
      href: '/apps/builder/modules/library'
    },
    {
      id: 'complete',
      title: 'Complete Builder',
      description: 'Build a full app in one workflow',
      icon: <Settings2 className="h-8 w-8 text-purple-500 dark:text-purple-400" />,
      href: '/apps/builder'
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">App Builder Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">Choose a component to build or modify</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {builderModules.map((module) => (
          <Card key={module.id} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                {module.icon}
                <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">{module.title}</CardTitle>
              </div>
              <CardDescription className="text-gray-600 dark:text-gray-400">{module.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-16 flex items-center justify-center">
                {module.icon && React.cloneElement(module.icon, { className: "h-14 w-14 opacity-10" })}
              </div>
            </CardContent>
            <CardFooter>
              <Link href={module.href} className="w-full">
                <Button className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100">
                  Open Builder
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default BuilderHub; 