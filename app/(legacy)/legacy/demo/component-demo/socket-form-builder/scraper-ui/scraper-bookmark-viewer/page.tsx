"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RawJsonExplorer from "@/components/official/json-explorer/RawJsonExplorer";
import BookmarkViewer from "@/features/scraper/parts/BookmarkViewer";

// Example data - replace with your own data source
const exampleData = {
  users: [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      profile: {
        address: {
          street: "123 Main St",
          city: "Anytown",
          zipCode: "12345"
        },
        preferences: {
          theme: "dark",
          notifications: true
        }
      },
      orders: [
        { id: 101, product: "Laptop", price: 999.99 },
        { id: 102, product: "Headphones", price: 149.99 }
      ]
    },
    // More users...
  ],
  products: [
    // Product data...
  ],
  settings: {
    // Settings data...
  }
};

const JsonExplorerWithBookmarks = () => {
  // This could come from an API or other data source
  const [jsonData, setJsonData] = useState(exampleData);
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">JSON Explorer with Bookmarks</h1>
      
      <Tabs defaultValue="explorer" className="w-full">
        <TabsList>
          <TabsTrigger value="explorer">JSON Explorer</TabsTrigger>
          <TabsTrigger value="viewer">Bookmark Viewer</TabsTrigger>
        </TabsList>
        
        <TabsContent value="explorer" className="mt-4">
          <div className="bg-textured rounded-lg shadow p-4">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Explore your JSON structure, save paths as bookmarks, and export them for later use.
            </p>
            <RawJsonExplorer pageData={jsonData} />
          </div>
        </TabsContent>
        
        <TabsContent value="viewer" className="mt-4">
          <div className="bg-textured rounded-lg shadow p-4">
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Import your saved bookmarks to quickly view values from your data structure.
            </p>
            <BookmarkViewer pageData={jsonData} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JsonExplorerWithBookmarks;

/**
 * How to use:
 * 
 * 1. In the "JSON Explorer" tab:
 *    - Navigate through your complex data structure
 *    - When you find a useful path, click "Save" to bookmark it
 *    - Give it a name and optional description
 *    - After creating several bookmarks, click "Export" to copy them all to clipboard
 * 
 * 2. In the "Bookmark Viewer" tab:
 *    - Click "Import Bookmarks" and paste your exported JSON
 *    - See all your bookmarked values displayed in cards
 *    - The viewer shows the current value at each bookmarked path
 * 
 * This setup allows you to:
 * 1. Explore and "map" your complex data in the Explorer
 * 2. Export the bookmarks as a configuration
 * 3. Use that configuration in the Viewer to display just the parts you care about
 * 
 * You can save the bookmark configurations to a database for later use.
 */