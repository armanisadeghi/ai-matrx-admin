// File: app/(authenticated)/admin/socketio/layout.tsx

import React from 'react';

export default function StyledLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-200 scrollbar-none">
      {/* Main content container */}
      {children}
      
      {/* Extra scroll space that inherits background - reduced from h-screen to a more reasonable value */}
      <div className="h-24 bg-inherit" aria-hidden="true"></div>
    </div>
  );
}