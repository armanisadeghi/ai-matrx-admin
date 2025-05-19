"use client";

import React from 'react';
import { List, Type } from 'lucide-react';

interface ContentStructureData {
  intro: {
    title: string;
    text: string;
  };
  items: Array<{
    id: number;
    title: string;
    text: string;
  }>;
  outro: {
    title: string;
    text: string;
  };
}

interface ContentStructureViewProps {
  data: {
    extracted: ContentStructureData;
    miscellaneous?: any[];
  };
}

const ContentStructureView: React.FC<ContentStructureViewProps> = ({ data }) => {
  const { intro, items, outro } = data.extracted;

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
      {/* Intro Section */}
      {(intro.title || intro.text) && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-3">
            <Type className="mr-2 text-blue-500 dark:text-blue-400" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {intro.title || 'Introduction'}
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{intro.text}</p>
        </div>
      )}

      {/* Items Section */}
      {items.length > 0 && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <List className="mr-2 text-blue-500 dark:text-blue-400" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Key Points</h2>
          </div>
          <div className="space-y-4">
            {items.map((item) => (
              <div 
                key={item.id} 
                className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md"
              >
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outro Section */}
      {(outro.title || outro.text) && (
        <div className="p-6">
          <div className="flex items-center mb-3">
            <Type className="mr-2 text-blue-500 dark:text-blue-400" size={20} />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {outro.title || 'Conclusion'}
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-300">{outro.text}</p>
        </div>
      )}
    </div>
  );
};

export default ContentStructureView; 