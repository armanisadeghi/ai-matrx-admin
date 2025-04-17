import React from 'react';

export default function StyledLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-200">
      {/* Main content container */}
      {children}
      
    </div>
  );
}