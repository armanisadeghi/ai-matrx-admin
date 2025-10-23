// File: app/(authenticated)/admin/socketio/layout.tsx

import React from 'react';

export default function StyledLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full bg-textured text-gray-900 dark:text-gray-200">
      {/* Main content container */}
      {children}
      
      {/* Extra scroll space that inherits background */}
      <div className="h-screen bg-inherit" aria-hidden="true"></div>
    </div>
  );
}