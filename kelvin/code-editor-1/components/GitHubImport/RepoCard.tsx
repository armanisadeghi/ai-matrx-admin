import { HTMLAttributes } from "react";
import { IRepository } from "./GitHubImport";

type RepoCardProps = HTMLAttributes<HTMLDivElement> & {
    repo: IRepository;
    handleCloneRepo: (repoName: IRepository) => Promise<void>;
    loading: boolean;
};

export const RepoCard: React.FC<RepoCardProps> = ({ repo, handleCloneRepo, loading, ...others }) => {
    if (loading) {
        return <>loading</>;
    }

    return (
        <div
            className="p-2 cursor-pointer rounded-md border-2 border-neutral-700 transition ease-in-out hover:border-2 hover:border-neutral-400"
            onClick={() => {
                handleCloneRepo(repo);
            }}
            {...others}
        >
            <p className="text-md font-medium mb-1">{repo.name}</p>
            <p className="text-sm no-underline">{repo.full_name}</p>
        </div>
    );
};
