import { ReactNode } from "react";

type SidebarProps = {
    addFileFolder: ReactNode;
    fileTree: ReactNode;
    className?: string;
};

export const Sidebar: React.FC<SidebarProps> = ({ addFileFolder, fileTree, className }) => {
    const sidebarClasses = `p-2 flex flex-col rounded ${className}`;

    return (
        <div className={sidebarClasses}>
            <div className="flex items-center justify-between text-white">
                <p className="text-sm">Files</p>
                <div className="flex gap-2">{addFileFolder}</div>
            </div>
            <div className="flex-grow overflow-auto">{fileTree}</div>
        </div>
    );
};
