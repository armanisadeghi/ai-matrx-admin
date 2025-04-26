import React, { useState } from "react";
import { SearchLayoutProps } from "@/features/applet/layouts/types";
import { fieldController } from "@/features/applet/runner/components/field-components/FieldController";

const ContextualSearchLayout: React.FC<SearchLayoutProps> = ({
  config,
  activeTab,
  actionButton,
  className = "",
}) => {
  const activeSearchGroups = config[activeTab] || [];
  
  // Track the visual context (could be tied to actual search context in a real implementation)
  const [context, setContext] = useState<'hotels' | 'flights' | 'dining' | 'activities'>('hotels');
  
  // Background images/gradients for each context
  const contextStyles = {
    hotels: {
      background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/hotels-bg.jpg')",
      fallbackBg: "linear-gradient(to right, #0f2027, #203a43, #2c5364)",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 14h18v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7Z"></path>
          <path d="M21 7v7H3V7a1 1 0 0 1 1-1h3v3h5V6h7a1 1 0 0 1 1 1Z"></path>
          <path d="M6 6V3c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v3"></path>
        </svg>
      )
    },
    flights: {
      background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/flights-bg.jpg')",
      fallbackBg: "linear-gradient(to right, #2c3e50, #4ca1af)",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"></path>
        </svg>
      )
    },
    dining: {
      background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/dining-bg.jpg')",
      fallbackBg: "linear-gradient(to right, #654ea3, #eaafc8)",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
          <path d="M7 2v20"></path>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>
        </svg>
      )
    },
    activities: {
      background: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.7)), url('/images/activities-bg.jpg')",
      fallbackBg: "linear-gradient(to right, #134e5e, #71b280)",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m8 14 2.5-2.5"></path>
          <path d="M13 8.5 8 13"></path>
          <path d="m16 16-3.5-3.5"></path>
          <path d="M10.5 13.5 8.5 11"></path>
        </svg>
      )
    }
  };

  // Get the current style
  const currentStyle = contextStyles[context];

  return (
    <div 
      className={`w-full ${className}`}
      style={{ 
        background: currentStyle.fallbackBg,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background 1s ease-in-out',
      }}
    >
      {/* Context selector */}
      <div className="w-full max-w-5xl mx-auto pt-10 pb-6 px-4">
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-black bg-opacity-50 backdrop-blur-sm rounded-full p-1">
            {(Object.keys(contextStyles) as Array<keyof typeof contextStyles>).map((key) => (
              <button
                key={key}
                onClick={() => setContext(key)}
                className={`flex items-center text-white rounded-full px-4 py-2 transition ${
                  context === key 
                    ? 'bg-rose-500' 
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <span className="mr-2">{contextStyles[key].icon}</span>
                <span className="capitalize">{key}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90">
          <h2 className="text-2xl font-medium text-center mb-8">Find the perfect {context}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {activeSearchGroups.map((group) => (
              <div key={group.id} className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{group.label}</h3>
                
                {group.fields.map((field) => (
                  <div key={field.brokerId}>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {field.label}
                    </label>
                    {fieldController(field, false)}
                    {field.helpText && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          
          <div className="mt-10 flex justify-center">
            {actionButton || (
              <button className="bg-rose-500 hover:bg-rose-600 text-white rounded-full px-8 py-3 text-lg shadow-lg">
                Search {context}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextualSearchLayout;