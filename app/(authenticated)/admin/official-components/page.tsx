// File: app/(authenticated)/admin/official-components/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { componentList, ComponentEntry, ComponentCategory, getCategoriesWithCounts, searchComponents } from './parts/component-list';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FolderOpen, Code, Component, Server, Menu, PanelLeft, Layers, Layout, BarChart, Eye, MessageSquare, FileUp, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Map categories to icons
const categoryIcons: Record<ComponentCategory, React.ReactNode> = {
  buttons: <Menu className="h-4 w-4" />,
  navigation: <PanelLeft className="h-4 w-4" />,
  layout: <Layout className="h-4 w-4" />,
  inputs: <FileUp className="h-4 w-4" />,
  display: <Eye className="h-4 w-4" />,
  feedback: <MessageSquare className="h-4 w-4" />,
  data: <BarChart className="h-4 w-4" />,
  overlays: <Layers className="h-4 w-4" />,
  media: <Image className="h-4 w-4" />
};

// Human-friendly category names
const categoryNames: Record<ComponentCategory, string> = {
  buttons: 'Buttons',
  navigation: 'Navigation',
  layout: 'Layout',
  inputs: 'Inputs',
  display: 'Display',
  feedback: 'Feedback',
  data: 'Data',
  overlays: 'Overlays',
  media: 'Media'
};

export default function OfficialComponentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [filteredComponents, setFilteredComponents] = useState<ComponentEntry[]>(componentList);
  const categories = getCategoriesWithCounts();
  
  // Apply filtering when search query or selected category changes
  useEffect(() => {
    let results = searchQuery ? searchComponents(searchQuery) : componentList;
    
    if (selectedCategory !== 'all') {
      results = results.filter(component => component.category === selectedCategory);
    }
    
    setFilteredComponents(results);
  }, [searchQuery, selectedCategory]);
  
  // Get all available categories with counts
  const categoriesWithAll = [
    { category: 'all' as const, count: componentList.length },
    ...categories
  ];
  
  return (
    <div className="w-full px-4 py-6">
      <header className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-gray-800 dark:text-gray-200 mt-2">
            Official Components
            </p>
          </div>
          <Link href="/admin/official-components/documentation">
            <Button variant="outline" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Documentation
            </Button>
          </Link>
        </div>
        
        {/* Search and filter */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              type="text"
              placeholder="Search components by name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar with categories */}
        <aside className="md:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="px-4 pb-4">
                  {categoriesWithAll.map(({ category, count }) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors mb-1",
                        selectedCategory === category 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {category === 'all' ? (
                          <Component className="h-4 w-4" />
                        ) : (
                          categoryIcons[category]
                        )}
                        {category === 'all' ? 'All Components' : categoryNames[category]}
                      </span>
                      <Badge variant="secondary" className="ml-auto">
                        {count}
                      </Badge>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>
        
        {/* Main content */}
        <main className="md:col-span-9">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">
                {selectedCategory === 'all' 
                  ? 'All Components' 
                  : `${categoryNames[selectedCategory]} Components`}
                {searchQuery && ` matching "${searchQuery}"`}
              </CardTitle>
              <CardDescription>
                {filteredComponents.length} component{filteredComponents.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredComponents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredComponents.map((component) => (
                    <Link 
                      href={`/admin/official-components/${component.id}`}
                      key={component.id}
                    >
                      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            {categoryIcons[component.category]}
                            {component.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {component.description}
                          </p>
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-1 pt-0">
                          {component.tags?.slice(0, 3).map(tag => (
                            <Badge 
                              key={tag} 
                              variant="outline" 
                              className="text-xs font-normal"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {(component.tags?.length || 0) > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">
                              +{(component.tags?.length || 0) - 3} more
                            </Badge>
                          )}
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Server className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    No components found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Try adjusting your search or filter to find what you're looking for.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
