import { IconFile, IconFolder, IconChevronDown } from '@tabler/icons-react';

export interface IFileStructure {
    name: string;
    type: 'file' | 'folder';
    content?: string;
    children?: IFileStructure[];
}

interface IFileExplorerProps {
    items: IFileStructure[];
    selectedFile: string | null;
    onFileSelect: (fileName: string) => void;
}

export const FileExplorer = ({ items, selectedFile, onFileSelect }: IFileExplorerProps) => {
    return (
        <div className="pl-2">
            {items.map((item) => (
                <div key={item.name}>
                    <div
                        className={`flex items-center gap-2 p-1 hover:bg-neutral-700 rounded cursor-pointer ${
                            selectedFile === item.name ? 'bg-neutral-700' : ''
                        }`}
                        onClick={() => item.type === 'file' && onFileSelect(item.name)}
                    >
                        {item.type === 'folder' ? (
                            <>
                                <IconChevronDown size={16} />
                                <IconFolder size={16} className="text-blue-400" />
                            </>
                        ) : (
                            <IconFile size={16} className="ml-4 text-neutral-400" />
                        )}
                        <span className="text-sm">{item.name}</span>
                    </div>
                    {item.children && (
                        <FileExplorer
                            items={item.children}
                            selectedFile={selectedFile}
                            onFileSelect={onFileSelect}
                        />
                    )}
                </div>
            ))}
        </div>
    );
};