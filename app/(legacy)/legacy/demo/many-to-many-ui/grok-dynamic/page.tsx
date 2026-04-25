"use client";

import React, { useState } from "react";

import { aiModelEndpointConfig, recipeMessageConfig } from "./definitions";
import DynamicRelationshipMaker from "./DynamicRelationshipMaker";

export default function Page() {
    const [config, setConfig] = useState(aiModelEndpointConfig);
    
    return (
      <div className="w-full h-full">
        <div className="flex gap-2 p-2">
          <button
            onClick={() => setConfig(aiModelEndpointConfig)}
            className="px-3 py-2 text-sm font-medium rounded-md transition-colors
                       dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600
                       border border-gray-300 dark:border-gray-600
                       bg-blue-50 text-blue-700 hover:bg-blue-100 
                       border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            AI Model Endpoint
          </button>
          
          <button
            onClick={() => setConfig(recipeMessageConfig)}
            className="px-3 py-2 text-sm font-medium rounded-md transition-colors
                       dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600
                       border border-gray-300 dark:border-gray-600
                       bg-blue-50 text-blue-700 hover:bg-blue-100 
                       border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Recipe Message
          </button>
        </div>
        <DynamicRelationshipMaker config={config} />
      </div>
    );
  }