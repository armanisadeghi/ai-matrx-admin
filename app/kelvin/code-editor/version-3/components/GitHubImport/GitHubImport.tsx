import { ChangeEvent, useEffect, useState } from "react";
import { getOctokit, indexedDBStore } from "../../utils";
import { RepoCard } from "./RepoCard";
import { IRepoData } from "../../types";
import { TextInput } from "../Inputs";
import { Button } from "../Buttons";
import { IconBrandGithub, IconReload } from "@tabler/icons-react";

export type IRepository = {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
};

export const GitHubImport = ({ onRepoCloned }: { onRepoCloned: (repo: IRepoData) => void }) => {
    const [repositories, setRepositories] = useState<IRepository[]>([]);
    const [filteredRepositories, setFilteredRepositories] = useState<IRepository[]>([]);
    const [searchText, setSearchText] = useState("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [checkAuthLoading, setCheckAuthLoading] = useState<boolean>(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [isCloning, setIsCloning] = useState<boolean>(false);
    const [currentCloningFile, setCurrentCloningFile] = useState<string>("");

    const reposPerPage = 9;

    useEffect(() => {
        checkGitHubAuth();
    }, []);

    const checkGitHubAuth = async () => {
        try {
            setCheckAuthLoading(true);
            const response = await fetch("/api/auth/github-status");
            const data = await response.json();
            setIsAuthenticated(data.isAuthenticated);
            if (data.isAuthenticated) {
                await fetchAllRepositories();
            }
            setCheckAuthLoading(false);
        } catch (error) {
            console.error("Error checking GitHub auth status:", error);
            setCheckAuthLoading(false);
        }
    };

    const handleGitHubLogin = () => {
        window.location.href = "/api/auth/github";
    };

    const fetchAllRepositories = async () => {
        setIsLoading(true);
        try {
            const octokit = await getOctokit();
            let page = 1;
            let allRepos: IRepository[] = [];
            let hasNextPage = true;

            while (hasNextPage) {
                const response = await octokit.repos.listForAuthenticatedUser({
                    per_page: 100,
                    page: page,
                });

                const newRepos = response.data.map((repo) => ({
                    id: repo.id,
                    name: repo.name,
                    full_name: repo.full_name,
                    html_url: repo.html_url,
                }));

                allRepos = [...allRepos, ...newRepos];

                if (response.data.length < 100) {
                    hasNextPage = false;
                } else {
                    page++;
                }
            }

            setRepositories(allRepos);
            setFilteredRepositories(allRepos);
        } catch (error) {
            console.error("Error fetching repositories:", error);
            alert("Failed to fetch repositories. Please check your GitHub token.");
        }
        setIsLoading(false);
    };

    const handleCloneRepository = async (repository: IRepository) => {
        if (!repository.name) {
            alert("Please select a repository");
            return;
        }

        if (!confirm(`Are you sure you want to proceed cloning '${repository.name}' repository?`)) {
            return;
        }

        setIsCloning(true);
        try {
            const [owner, repo] = repository.full_name.split("/");
            const octokit = await getOctokit();
            const files = await fetchAllFiles(octokit, owner, repo);
            await indexedDBStore.addRepository({ name: repository.name, files, githubUrl: repository.html_url });
            onRepoCloned({ name: repository.name, files, githubUrl: repository.html_url });
        } catch (error) {
            console.error("Error cloning repository:", error);
            alert("Failed to clone repository. Please try again.");
        }
        setIsCloning(false);
        setCurrentCloningFile("");
    };

    const fetchAllFiles = async (octokit: any, owner: string, repo: string, path: string = ""): Promise<any> => {
        const response = await octokit.repos.getContent({
            owner,
            repo,
            path,
        });

        if (Array.isArray(response.data)) {
            const files: any = {};
            for (const item of response.data) {
                setCurrentCloningFile(item.path);

                if (item.type === "file") {
                    const content = await octokit.repos.getContent({
                        owner,
                        repo,
                        path: item.path,
                    });
                    files[item.path] = (content.data as any).content;
                } else if (item.type === "dir") {
                    const subFiles = await fetchAllFiles(octokit, owner, repo, item.path);
                    Object.assign(files, subFiles);
                }
            }
            return files;
        } else {
            return { [path]: (response.data as any).content };
        }
    };

    const handleSearchInput = (evt: ChangeEvent<HTMLInputElement>) => {
        const value = evt.currentTarget.value.toLowerCase();
        const filtered = repositories.filter(
            (repo) => repo.name.toLowerCase().includes(value) || repo.full_name.toLowerCase().includes(value),
        );
        setSearchText(value);
        setFilteredRepositories(filtered);
        setCurrentPage(1); // Reset to first page when searching
    };

    const indexOfLastRepo = currentPage * reposPerPage;
    const indexOfFirstRepo = indexOfLastRepo - reposPerPage;
    const currentRepos = filteredRepositories.slice(indexOfFirstRepo, indexOfLastRepo);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className="space-y-4">
            <p className="text-lg font-semibold">Import project from GitHub</p>

            {!isAuthenticated ? (
                <Button
                    onClick={handleGitHubLogin}
                    loading={checkAuthLoading}
                    variant="light"
                    leftSection={<IconBrandGithub size={16} />}
                >
                    {isLoading ? "Logging in..." : "Login with GitHub"}
                </Button>
            ) : (
                <>
                    <TextInput
                        type="text"
                        placeholder="Search repositories"
                        value={searchText}
                        onChange={handleSearchInput}
                    />

                    {isCloning && (
                        <div className="mt-4 p-4 bg-neutral-700 border border-neutral-500 rounded text-white">
                            <p className="text-sm font-semibold mb-2">Cloning repository...</p>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full animate-indeterminate-progress"></div>
                            </div>
                            <p className="text-xs mt-2 ">Current file: {currentCloningFile}</p>
                        </div>
                    )}

                    {!isCloning && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentRepos.map((repo) => (
                                <RepoCard
                                    key={repo.id}
                                    repo={repo}
                                    handleCloneRepo={handleCloneRepository}
                                    loading={isLoading}
                                />
                            ))}
                        </div>
                    )}

                    {!isCloning && (
                        <>
                            <div className="flex justify-between items-center mt-4">
                                <Button
                                    onClick={() => paginate(currentPage - 1)}
                                    disabled={currentPage === 1 || isCloning}
                                    variant="subtle"
                                >
                                    Previous
                                </Button>
                                <span>
                                    Page {currentPage} of {Math.ceil(filteredRepositories.length / reposPerPage)}
                                </span>
                                <Button
                                    onClick={() => paginate(currentPage + 1)}
                                    disabled={
                                        currentPage === Math.ceil(filteredRepositories.length / reposPerPage) ||
                                        isCloning
                                    }
                                    variant="subtle"
                                >
                                    Next
                                </Button>
                            </div>

                            <Button
                                onClick={fetchAllRepositories}
                                loading={isLoading || isCloning}
                                leftSection={<IconReload size={16} />}
                                variant="subtle"
                            >
                                {isLoading ? "Refreshing..." : "Refresh Repositories"}
                            </Button>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
