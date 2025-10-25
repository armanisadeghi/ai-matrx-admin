import { FilteredFileView } from '../components/FilteredFileView';
import { FILE_ROUTES } from '../file-routes.config';

export const metadata = {
  title: 'Images | File Manager',
  description: 'Browse all your image files',
};

export default function ImagesPage() {
  const route = FILE_ROUTES.IMAGES;
  
  return (
    <FilteredFileView
      title={route.label}
      description={route.description}
      icon={route.icon}
      fileCategory={route.fileCategory!}
    />
  );
}

