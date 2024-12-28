
import { useFileSystem } from '@/providers/FileSystemProvider';
import { useDialogRegistry } from '../../useDialogRegistry';
import { DeleteDialog } from '@/components/FileManager/Dialogs/DeleteDialog';
import { RenameDialog } from '@/components/FileManager/Dialogs/RenameDialog';

export const FileSystemDialogs: React.FC = () => {
    const {
        deleteFile,
        renameCurrentItem
    } = useFileSystem();

    const dialogConfigs = [
        {
            id: 'filesystem.delete',
            component: DeleteDialog,
            defaultProps: {
                onSubmit: deleteFile
            }
        },
        {
            id: 'filesystem.rename',
            component: RenameDialog,
            defaultProps: {
                onSubmit: renameCurrentItem
            }
        }
    ];

    useDialogRegistry(dialogConfigs);

    return null;
};

// // Usage in components:
// const MyComponent = () => {
//     const { openDialog } = useDialog();
    
//     const handleDelete = () => {
//         openDialog('filesystem.delete', {
//             // Additional props if needed
//             customTitle: 'Delete this item?'
//         });
//     };
    
//     return <button onClick={handleDelete}>Delete</button>;
// };
