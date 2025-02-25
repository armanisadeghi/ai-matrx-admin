import { IconPackages, IconTrash } from "@tabler/icons-react";

import { HTMLAttributes } from "react";
import { IRepoData } from "../../types";
import { Button } from "@/app/dashboard/code-editor/components";

type ProjectCardProps = HTMLAttributes<HTMLDivElement> & {
    repo: IRepoData;
    handleDelete: (repoName: string) => void;
    handleSelect: (repoName: string) => Promise<void>;
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ repo, handleDelete, handleSelect, ...others }) => {
    return (
        <div
            className="flex items-center p-3 border border-neutral-600 rounded-md transition ease delay-150 hover:border-1.5 hover:border-neutral-500"
            {...others}
        >
            <div
                className="grow flex items-center gap-3 cursor-pointer hover:font-semibold"
                onClick={() => handleSelect(repo.name)}
            >
                <IconPackages />
                <p className="font-medium">{repo.name}</p>
            </div>
            <div className="flex">
                <Button variant="danger" onClick={() => handleDelete(repo.name)} leftSection={<IconTrash size={16} />}>
                    Delete
                </Button>
            </div>
        </div>
    );
};
