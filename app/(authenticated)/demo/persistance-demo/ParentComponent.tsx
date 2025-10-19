"use client";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TestTabSection from "./TestTabSection";

const ParentComponent = () => {
  // Parent state
  const [parentContent, setParentContent] = useState("Initial parent content");
  const [updateEnabled, setUpdateEnabled] = useState(true);
  const [timestamp, setTimestamp] = useState(Date.now());
  
  // Update timestamp whenever parent content changes
  const updateParentContent = (newContent) => {
    setParentContent(newContent);
    setTimestamp(Date.now());
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-textured p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-800">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">Parent Component Controls</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Parent Content:
              </label>
              <input
                type="text"
                value={parentContent}
                onChange={(e) => updateParentContent(e.target.value)}
                className="p-2 border rounded w-full bg-textured text-black dark:text-white"
                placeholder="Update parent content..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="update-toggle"
                checked={updateEnabled}
                onChange={() => setUpdateEnabled(!updateEnabled)}
                className="h-4 w-4 text-blue-600"
              />
              <label htmlFor="update-toggle" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Allow parent updates to propagate to child
              </label>
            </div>
            
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Last update: {new Date(timestamp).toLocaleTimeString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Update propagation: <span className={updateEnabled ? "text-green-500" : "text-red-500"}>
                  {updateEnabled ? "Enabled" : "Disabled"}
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <Tabs 
          defaultValue="tab1" 
          className="bg-textured p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-800"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="tab1">Child Component</TabsTrigger>
            <TabsTrigger value="tab2">Other Tab</TabsTrigger>
            <TabsTrigger value="tab3">Another Tab</TabsTrigger>
          </TabsList>
          
          {/* Use forceMount to keep the component mounted even when tab is inactive */}
          <TabsContent value="tab1" className="focus:outline-none" forceMount>
            <div className={`p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 data-[state=inactive]:hidden`}>
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                Child Component (Tab 1)
              </h3>
              
              <TestTabSection
                parentContent={parentContent}
                updateEnabled={updateEnabled}
                timestamp={timestamp}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="tab2" className="focus:outline-none">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Other Tab Content</h3>
              <p className="text-gray-700 dark:text-gray-300">
                This tab intentionally doesn't show the component. Navigate back to the "Child Component" 
                tab to verify if the component's state persists.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="tab3" className="focus:outline-none">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Another Tab</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Switch between tabs to test if the component's state persists.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="bg-textured p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-800">
          <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">How to Test:</h3>
          <ol className="list-decimal pl-5 space-y-2 text-gray-700 dark:text-gray-300">
            <li>Change the "Local content" in the child component</li>
            <li>Increment the local counter</li>
            <li>Switch to another tab</li>
            <li>Switch back - both changes should persist</li>
            <li>With "Allow parent updates" checked, change the parent content - the child should update</li>
            <li>Uncheck "Allow parent updates" and change parent content - the child should NOT update</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ParentComponent;