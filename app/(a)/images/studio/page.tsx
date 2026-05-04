'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ImageStudioShell = dynamic(
  () =>
    import('@/features/images/components/studio/ImageStudioShell').then((m) => ({
      default: m.ImageStudioShell,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col gap-3 p-4 h-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="flex-1 w-full" />
      </div>
    ),
  },
);

export default function StudioPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ImageStudioShell defaultFolder="Images/Generated" />
    </div>
  );
}
