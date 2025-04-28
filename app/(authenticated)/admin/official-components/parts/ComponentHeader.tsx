'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FolderOpen, ChevronLeft, Menu, PanelLeft, Layout, BarChart, Eye, MessageSquare, FileUp, Image, Layers } from 'lucide-react';
import { ComponentEntry, ComponentCategory, componentList, categoryNames, categoryIcons } from './component-list';


interface ComponentHeaderProps {
  title?: string;
}

export default function ComponentHeader({ title }: ComponentHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract component ID from the URL if we're on a component detail page
  const componentId = useMemo(() => {
    const match = pathname.match(/\/admin\/official-components\/([^\/]+)$/);
    return match ? match[1] : null;
  }, [pathname]);

  // Find the current component if we're on a component detail page
  const currentComponent = useMemo(() => {
    if (!componentId || componentId === 'documentation') return null;
    return componentList.find(c => c.id === componentId);
  }, [componentId]);

  // Determine if we're on the main components page
  const isMainPage = useMemo(() => {
    return pathname === '/admin/official-components';
  }, [pathname]);

  // Determine if we're on the documentation page
  const isDocPage = useMemo(() => {
    return pathname === '/admin/official-components/documentation';
  }, [pathname]);

  // Find related components (same category as current component)
  const relatedComponents = useMemo(() => {
    if (!currentComponent) return [];
    return componentList
      .filter(c => c.category === currentComponent.category && c.id !== currentComponent.id)
      .slice(0, 4); // Limit to 4 related components
  }, [currentComponent]);

  // Get all categories for the category pills
  const allCategories = useMemo(() => {
    const categories = new Set<ComponentCategory>();
    componentList.forEach(c => categories.add(c.category));
    return Array.from(categories);
  }, []);

  return (
    <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-3 px-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {!isMainPage && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/admin/official-components')}
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          
          <h1 className="text-lg font-medium">
            {isMainPage ? 'Official Components' : 
             isDocPage ? 'Component Documentation' : 
             currentComponent?.name || title || 'Component Details'}
          </h1>
          
          {currentComponent && (
            <Badge className="ml-2">
              {categoryNames[currentComponent.category]}
            </Badge>
          )}
        </div>
        
        <Link href="/admin/official-components/documentation">
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Documentation
          </Button>
        </Link>
      </div>
      
      {/* Category pills */}
      <div className="mt-4">
        <ScrollArea className="w-full" dir="ltr">
          <div className="flex space-x-2 pb-2">
            <Link href="/admin/official-components">
              <Badge 
                variant={isMainPage ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
              >
                All Components
              </Badge>
            </Link>
            
            {allCategories.map(category => (
              <Link 
                key={category} 
                href={`/admin/official-components?category=${category}`}
              >
                <Badge 
                  variant={(currentComponent?.category === category) ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap flex items-center"
                >
                  {categoryIcons[category]}
                  <span className="ml-1">{categoryNames[category]}</span>
                </Badge>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      {/* Related components cards (only shown on component detail pages) */}
      {currentComponent && relatedComponents.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">More {categoryNames[currentComponent.category]} Components:</h3>
          <ScrollArea className="w-full" dir="ltr">
            <div className="flex space-x-3 pb-2">
              {relatedComponents.map(component => (
                <Link 
                  key={component.id} 
                  href={`/admin/official-components/${component.id}`}
                  className="min-w-48 flex-shrink-0"
                >
                  <div className="border border-gray-200 dark:border-gray-800 rounded-md p-3 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer h-full">
                    <h4 className="font-medium mb-1 flex items-center">
                      {categoryIcons[component.category]}
                      <span className="ml-1">{component.name}</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {component.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

