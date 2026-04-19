// File: app/(authenticated)/(admin-auth)/administration/official-components/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  componentList,
  ComponentEntry,
  ComponentCategory,
  searchComponents,
  categoryNames,
  categoryIcons,
  getCategoriesByGroup,
  categoryGroups,
} from "./parts/component-list";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Component, Server, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PlaceholdersVanishingSearchInput } from "@/components/matrx/search-input/PlaceholdersVanishingSearchInput";

export default function OfficialComponentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    ComponentCategory | "all"
  >("all");
  const [filteredComponents, setFilteredComponents] =
    useState<ComponentEntry[]>(componentList);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  // Initialize expanded groups
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    Object.keys(categoryGroups).forEach((group) => {
      initialExpanded[group] = true; // Start with all groups expanded
    });
    setExpandedGroups(initialExpanded);
  }, []);

  // Toggle a group's expanded state
  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  // Apply filtering when search query or selected category changes
  useEffect(() => {
    // If searching, search ALL components (ignore category filter)
    if (searchQuery) {
      const results = searchComponents(searchQuery);
      setFilteredComponents(results);
      return;
    }

    // If not searching, apply category filter
    if (selectedCategory !== "all") {
      const results = componentList.filter((component) =>
        component.categories.includes(selectedCategory),
      );
      setFilteredComponents(results);
    } else {
      setFilteredComponents(componentList);
    }
  }, [searchQuery, selectedCategory]);

  // Get organized categories
  const categoriesByGroup = getCategoriesByGroup();

  return (
    <div className="flex flex-col h-[calc(100dvh-2.5rem)] w-full">
      <header className="px-2 py-1 shrink-0">
        <PlaceholdersVanishingSearchInput
          columnNames={["name", "description", "tags"]}
          onSearchChange={setSearchQuery}
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 px-2 pb-2 flex-1 min-h-0">
        {/* Sidebar with category groups */}
        <aside className="md:col-span-3 min-h-0 h-full">
          <Card className="flex flex-col h-full overflow-hidden py-0 gap-0">
            <CardHeader className="px-3 py-2 shrink-0 border-b">
              <CardTitle className="text-sm font-medium flex items-center justify-between gap-2">
                <span className="truncate">
                  Categories{" "}
                  <span className="text-muted-foreground font-normal">
                    ({componentList.length})
                  </span>
                </span>
                {searchQuery && (
                  <span className="text-[10px] font-normal text-muted-foreground truncate">
                    filter disabled
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "p-0 flex-1 min-h-0 overflow-hidden",
                searchQuery && "opacity-50 pointer-events-none",
              )}
            >
              <ScrollArea className="h-full">
                <div className="px-2 pb-4">
                  {/* All components option */}
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors mb-1",
                      selectedCategory === "all"
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Component className="h-4 w-4" />
                      All Components
                    </span>
                    <Badge variant="default" className="ml-auto">
                      {componentList.length}
                    </Badge>
                  </button>

                  {/* Category groups */}
                  {Object.entries(categoriesByGroup).map(
                    ([groupName, categories]) =>
                      categories.length > 0 && (
                        <div key={groupName} className="mt-3 first:mt-1">
                          <Collapsible
                            open={expandedGroups[groupName]}
                            onOpenChange={() => toggleGroup(groupName)}
                          >
                            <CollapsibleTrigger className="flex items-center w-full px-2 py-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-primary focus:outline-none">
                              {expandedGroups[groupName] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              {groupName}
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-2 space-y-1 mt-1">
                              {categories.map(({ category, count }) => (
                                <button
                                  key={category}
                                  onClick={() => setSelectedCategory(category)}
                                  className={cn(
                                    "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
                                    selectedCategory === category
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "hover:bg-accent hover:text-accent-foreground",
                                  )}
                                >
                                  <span className="flex items-center gap-2">
                                    {categoryIcons[category]}
                                    {categoryNames[category]}
                                  </span>
                                  <Badge variant="default" className="ml-auto">
                                    {count}
                                  </Badge>
                                </button>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      ),
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </aside>

        {/* Main content */}
        <main className="md:col-span-9 min-h-0 h-full">
          <Card className="flex flex-col h-full overflow-hidden py-0 gap-0">
            <CardHeader className="px-3 py-2 shrink-0 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0">
                <span className="truncate">
                  {searchQuery
                    ? `Results for "${searchQuery}"`
                    : selectedCategory === "all"
                      ? "All Components"
                      : categoryNames[selectedCategory]}
                </span>
                <span className="text-muted-foreground font-normal shrink-0">
                  ({filteredComponents.length})
                </span>
                {searchQuery && (
                  <span className="text-[10px] font-normal text-muted-foreground truncate hidden sm:inline">
                    all categories
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-y-auto p-3">
              {filteredComponents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredComponents.map((component) => (
                    <Link
                      href={`/administration/official-components/${component.id}`}
                      key={component.id}
                    >
                      <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base font-medium flex items-center gap-2">
                            {/* Show primary category icon */}
                            {categoryIcons[component.categories[0]]}
                            {component.name}
                          </CardTitle>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {/* Show category badges */}
                            {component.categories.map((cat) => (
                              <Badge
                                key={cat}
                                className="text-xs font-normal"
                                variant="default"
                              >
                                {categoryNames[cat]}
                              </Badge>
                            ))}
                          </div>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {component.description}
                          </p>
                        </CardContent>
                        <CardFooter className="flex flex-wrap gap-1 pt-0">
                          {component.tags?.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag}
                              variant="outline"
                              className="text-xs font-normal"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {(component.tags?.length || 0) > 3 && (
                            <Badge
                              variant="outline"
                              className="text-xs font-normal"
                            >
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
                    Try adjusting your search or filter to find what you're
                    looking for.
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
