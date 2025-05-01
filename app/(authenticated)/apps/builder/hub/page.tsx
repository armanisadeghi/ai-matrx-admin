'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { builderModules } from './build-modules';

const BuilderHub = () => {

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">App Builder Hub</h1>
        <p className="text-gray-600 dark:text-gray-400">Choose a component to build or modify</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {builderModules.map((module) => (
          <Link key={module.id} href={module.href} className="block group">
            <Card className="h-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.02] group-hover:border-gray-300 dark:group-hover:border-gray-600">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  {module.icon}
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">{module.title}</CardTitle>
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-400">{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-16 flex items-center justify-center">
                  {module.icon && React.cloneElement(module.icon, { className: `h-16 w-16 opacity-25 group-hover:opacity-40 transition-opacity ${module.icon.props.className.split(' ').filter(c => c.includes('text-')).join(' ')}` })}
                </div>
              </CardContent>
              <CardFooter>
                <div className="w-full">
                  <div className="w-full py-2 px-4 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-center font-medium transition-colors">
                    Open Builder
                  </div>
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BuilderHub; 