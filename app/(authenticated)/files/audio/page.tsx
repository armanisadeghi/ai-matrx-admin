import { FilteredFileView } from '../components/FilteredFileView';
import { FILE_ROUTES } from '../file-routes.config';

export const metadata = {
  title: 'Audio | File Manager',
  description: 'Browse all your audio files',
};

export default function AudioPage() {
  const route = FILE_ROUTES.AUDIO;
  
  return (
    <FilteredFileView
      title={route.label}
      description={route.description}
      icon={route.icon}
      fileCategory={route.fileCategory!}
    />
  );
}

