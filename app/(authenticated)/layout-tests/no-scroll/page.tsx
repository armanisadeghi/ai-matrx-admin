'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function NoScrollPage() {
  return (
    <div className="h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-2.5rem)] flex flex-col overflow-hidden">
      {/* Header - Red */}
      <div className="flex-shrink-0 h-16 bg-red-500 flex items-center justify-between px-4">
        <Link href="/layout-tests" className="text-white flex items-center gap-2">
          <ArrowLeft className="w-5 h-5" />
          Back
        </Link>
        <div className="text-white font-bold">HEADER</div>
      </div>

      {/* Content - Green - Should fill remaining space exactly */}
      <div className="flex-1 bg-green-500 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">NO SCROLL</h1>
          <p className="text-xl mb-2">This page should fit perfectly</p>
          <p className="text-lg">No scrolling should be possible</p>
          <p className="text-sm mt-4 opacity-80">
            Red = Header<br/>
            Green = Content<br/>
            Blue = Footer
          </p>
        </div>
      </div>

      {/* Footer - Blue */}
      <div className="flex-shrink-0 h-16 bg-blue-500 flex items-center justify-center pb-safe">
        <div className="text-white font-bold">FOOTER (with pb-safe)</div>
      </div>
    </div>
  );
}

