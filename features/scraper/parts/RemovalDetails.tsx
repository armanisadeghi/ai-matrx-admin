"use client";
import React, { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/**
 * Component for displaying removal details (content filter or noise remover)
 */
const RemovalDetails = ({ details, title }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  
  if (!details || details.length === 0) {
    return <div className="p-4 text-gray-500 dark:text-gray-400">No {title} available</div>;
  }
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
      <div className="space-y-2">
        {details.map((item, index) => (
          <Collapsible
            key={index}
            open={expandedSection === `${title}-${index}`}
            onOpenChange={() => 
              setExpandedSection(
                expandedSection === `${title}-${index}` ? null : `${title}-${index}`
              )
            }
            className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="w-full p-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 text-left">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">{item.type}</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">({item.details})</span>
              </div>
              <span>{expandedSection === `${title}-${index}` ? "−" : "+"}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="text-gray-700 dark:text-gray-300">{item.text || "No content details available"}</div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </div>
  );
};

export default RemovalDetails;