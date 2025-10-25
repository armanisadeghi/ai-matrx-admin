import { FilteredFileView } from '../components/FilteredFileView';
import { FILE_ROUTES } from '../file-routes.config';

export const metadata = {
  title: 'Videos | File Manager',
  description: 'Browse all your video files',
};

export default function VideosPage() {
  const route = FILE_ROUTES.VIDEOS;
  
  return (
    <FilteredFileView
      title={route.label}
      description={route.description}
      icon={route.icon}
      fileCategory={route.fileCategory!}
    />
  );
}

