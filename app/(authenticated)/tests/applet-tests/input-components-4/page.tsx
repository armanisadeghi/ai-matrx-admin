// app/booking/page.tsx
'use client';

import { useAppletData } from "@/context/AppletDataContext";

export default function BookingPage() {
  const { activeTab } = useAppletData();

  return (
    <div className="px-6">
      {activeTab === 'stays' ? (
        <div className="py-8">
          <h2 className="text-2xl font-semibold mb-6"></h2>
          {/* Stays content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Stay cards would go here */}
          </div>
        </div>
      ) : (
        <div className="py-8">
          <h2 className="text-2xl font-semibold mb-6">Popular Experiences</h2>
          {/* Experiences content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Experience cards would go here */}
          </div>
        </div>
      )}
    </div>
  );
}