"use client";

import React, { useEffect, useState } from 'react';

// The simplest possible response viewer - just displays content
// This specifically addresses the [object Object] issue
const SimpleResponseViewer = ({ responses }) => {
  if (!responses || Object.keys(responses).length === 0) {
    return <div>No responses yet</div>;
  }

  // Direct rendering approach
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Simple Response Viewer</h1>
      
      {Object.entries(responses).map(([index, response]) => {
        // This is the crucial part - ALWAYS convert objects to stringified JSON
        let displayContent = '';
        let contentType = 'unknown';
        
        if (response === null) {
          displayContent = 'null';
          contentType = 'null';
        }
        else if (typeof response === 'undefined') {
          displayContent = 'undefined';
          contentType = 'undefined'; 
        }
        else if (typeof response === 'object') {
          // ALWAYS stringify objects - this is the key fix
          try {
            displayContent = JSON.stringify(response, null, 2);
            contentType = Array.isArray(response) ? 'array' : 'object';
          } catch (err) {
            displayContent = `[Error stringifying: ${err.message}]`;
            contentType = 'error';
          }
        }
        else {
          // Handle primitive values
          displayContent = String(response);
          contentType = typeof response;
        }
        
        return (
          <div key={index} className="border rounded-md p-4 bg-white shadow-sm">
            <div className="flex justify-between mb-3">
              <h2 className="text-lg font-semibold">Response #{index}</h2>
              <span className="px-2 py-1 text-xs bg-gray-100 rounded-md">
                Type: {contentType}
              </span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm font-mono overflow-x-auto">
                {displayContent}
              </pre>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SimpleResponseViewer;