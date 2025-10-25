import { FilteredFileView } from '../components/FilteredFileView';
import { FILE_ROUTES } from '../file-routes.config';

export const metadata = {
  title: 'Documents | File Manager',
  description: 'Browse all your document files',
};

export default function DocumentsPage() {
  const route = FILE_ROUTES.DOCUMENTS;
  
  return (
    <FilteredFileView
      title={route.label}
      description={route.description}
      icon={route.icon}
      fileCategory={route.fileCategory!}
    />
  );
}

