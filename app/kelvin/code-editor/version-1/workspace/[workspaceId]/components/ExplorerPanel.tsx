import { DirectoryTree } from '@/components/DirectoryTree/DirectoryTree';
import { DirectoryTreeConfig } from '@/components/DirectoryTree/config';

interface ExplorerPanelProps {
    structure: Record<string, any>;
    onSelect: (path: string) => void;
}

export const ExplorerPanel: React.FC<ExplorerPanelProps> = ({ structure, onSelect }) => {
    const treeConfig: DirectoryTreeConfig = {
        excludeFiles: ['*.log', 'package-lock.json', 'yarn.lock', '*.map'],
        excludeDirs: ['node_modules', '.git', '.next', 'coverage'],
        hideHiddenFiles: false,
        showIcons: true,
        indentSize: 24,
        sortFoldersFirst: true
    };

    return (
        <DirectoryTree
            structure={structure}
            onSelect={onSelect}
            config={treeConfig}
            title="Explorer"
            className="bg-transparent border-none rounded-none"
        />
    );
};

// components/panels/TerminalPanel.tsx
interface TerminalPanelProps {
    content: string[];
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ content }) => {
    return (
        <div className="p-2 font-mono text-sm h-full bg-neutral-900">
            {content.map((line, index) => (
                <div key={index} className="flex items-center gap-2">
                    <span className="text-green-400">$</span>
                    <span>{line}</span>
                </div>
            ))}
        </div>
    );
};

// components/panels/OutputPanel.tsx
export const OutputPanel: React.FC = () => {
    return (
        <div className="p-4">
            <div className="text-sm text-neutral-400">
                No active debug session
            </div>
        </div>
    );
};

// components/panels/ProblemsPanel.tsx
export const ProblemsPanel: React.FC = () => {
    return (
        <div className="p-4">
            <div className="text-sm text-neutral-400">
                No problems found
            </div>
        </div>
    );
};