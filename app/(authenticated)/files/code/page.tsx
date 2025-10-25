import { FilteredFileView } from '../components/FilteredFileView';
import { FILE_ROUTES } from '../file-routes.config';

export const metadata = {
  title: 'Code | File Manager',
  description: 'Browse all your code files',
};

export default function CodePage() {
  const route = FILE_ROUTES.CODE;
  
  return (
    <FilteredFileView
      title={route.label}
      description={route.description}
      icon={route.icon}
      fileCategory={route.fileCategory!}
    />
  );
}

