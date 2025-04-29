// app\(authenticated)\apps\demo\page.tsx
'use client';
import { useAppletData } from '@/context/AppletDataContext';

export default function BookingPage() {
  const { activeTab } = useAppletData();
  
  // Format activeTab to Title Case (capitalize each word and replace dashes)
  const formatTabName = (tabName: string) => {
    return tabName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formattedTabName = formatTabName(activeTab);

  return (
    <div className="px-6">
      <div className="py-8">
        <h2 className="text-2xl font-semibold mb-6">{formattedTabName}</h2>
        {/* Content based on active tab */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cards would go here */}
        </div>
      </div>
    </div>
  );
}