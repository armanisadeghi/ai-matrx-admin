import { getOctokit, indexedDBStore } from ".";
import { IRepoData } from "../types";

export async function publishToGitHubRepo(repoName: string, description?: string, privacy?: boolean) {
    // Step 1: Authenticate with GitHub
    // const octokit = new Octokit({
    //     auth: process.env.NEXT_PUBLIC_GITHUB_TOKEN, // Use an environment variable for the token
    // });

    // Step 2: Retrieve repository data from IndexedDB
    const repoData = await indexedDBStore.getRepository(repoName);
    if (!repoData) {
        throw new Error(`Repository ${repoName} not found in IndexedDB`);
    }

    const octokit = await getOctokit();

    // Step 3: Create a new repository on GitHub
    const { data: githubRepoData } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: description,
        private: privacy, // Set to true if you want a private repository
    });

    // Step 4: Create and push files to GitHub
    for (const [filePath, content] of Object.entries(repoData.files)) {
        let base64Content: string;

        if (typeof content === "string") {
            // If content is already a string, encode it to base64
            base64Content = Buffer.from(content).toString("base64");
        } else if (content && typeof content === "object") {
            // If content is an object, stringify it first
            base64Content = Buffer.from(JSON.stringify(content)).toString("base64");
        } else {
            console.warn(`Skipping file ${filePath} due to invalid content type`);
            continue; // Skip this file and continue with the next one
        }

        await octokit.repos.createOrUpdateFileContents({
            owner: githubRepoData.owner.login,
            repo: repoName,
            path: filePath,
            message: `Add ${filePath}`,
            content: base64Content,
        });
    }

    // Update local IndexedDB with the GitHub URL
    repoData.githubUrl = githubRepoData.html_url;
    await indexedDBStore.addRepository(repoData);

    console.log(`Successfully published repository to ${githubRepoData.html_url}`);
    return githubRepoData.html_url;
}

export async function deleteGitHubRepo(repoName: string): Promise<void> {
    // Retrieve repository data from IndexedDB
    const repoData = (await indexedDBStore.getRepository(repoName)) as IRepoData;
    if (!repoData) {
        throw new Error(`Repository ${repoName} not found in IndexedDB`);
    }

    if (!repoData?.githubUrl) {
        throw new Error(`Repository ${repoName} does not have a GitHub URL`);
    }

    // Extract owner and repo from the GitHub URL
    const urlParts = new URL(repoData.githubUrl).pathname.split("/");
    const owner = urlParts[1];
    const repo = urlParts[2];

    const octokit = await getOctokit();

    // Delete the repository from GitHub
    await octokit.repos.delete({
        owner,
        repo,
    });

    // Remove the GitHub URL from the local IndexedDB
    delete repoData.githubUrl;
    await indexedDBStore.addRepository(repoData);

    console.log(`Successfully deleted repository ${repoName} from GitHub and updated local IndexedDB`);
}

export async function updateGitHubRepo(repoName: string): Promise<string> {
    // Retrieve repository data from IndexedDB
    const repoData = (await indexedDBStore.getRepository(repoName)) as IRepoData;
    if (!repoData) {
        throw new Error(`Repository ${repoName} not found in IndexedDB`);
    }

    if (!repoData.githubUrl) {
        throw new Error(`Repository ${repoName} does not have a GitHub URL. Please publish it first.`);
    }

    // Extract owner and repo from the GitHub URL
    const urlParts = new URL(repoData.githubUrl).pathname.split("/");
    const owner = urlParts[1];
    const repo = urlParts[2];

    // Update files on GitHub
    for (const [filePath, content] of Object.entries(repoData.files)) {
        let base64Content: string;

        if (typeof content === "string") {
            base64Content = Buffer.from(content).toString("base64");
        } else if (content && typeof content === "object") {
            base64Content = Buffer.from(JSON.stringify(content)).toString("base64");
        } else {
            console.warn(`Skipping file ${filePath} due to invalid content type`);
            continue;
        }
        const octokit = await getOctokit();

        try {
            // Try to get the file first
            const { data: existingFile } = await octokit.repos.getContent({
                owner,
                repo,
                path: filePath,
            });

            // If file exists, update it
            if ("sha" in existingFile) {
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: filePath,
                    message: `Update ${filePath}`,
                    content: base64Content,
                    sha: existingFile.sha,
                });
            }
        } catch (error) {
            // If file doesn't exist, create it
            if (error.status === 404) {
                await octokit.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    path: filePath,
                    message: `Add ${filePath}`,
                    content: base64Content,
                });
            } else {
                throw error;
            }
        }
    }

    console.log(`Successfully updated repository ${repoName} on GitHub`);
    return repoData.githubUrl;
}

export async function fetchAndStoreRepos() {
    const octokit = await getOctokit();
    const { data: repos } = await octokit.repos.listForAuthenticatedUser();

    for (const repo of repos) {
        const { data: contents } = await octokit.repos.getContent({
            owner: repo.owner.login,
            repo: repo.name,
            path: "",
        });

        const files: { [key: string]: string } = {};

        for (const item of contents as any) {
            if (item.type === "file") {
                const { data: fileContent } = await octokit.repos.getContent({
                    owner: repo.owner.login,
                    repo: repo.name,
                    path: item.path,
                });

                if ("content" in fileContent) {
                    const decodedContent = Buffer.from(fileContent.content, "base64").toString("utf-8");
                    files[item.path] = decodedContent;
                }
            }
        }

        const repoData: IRepoData = {
            name: repo.name,
            description: repo.description || "",
            files: files,
        };

        await indexedDBStore.addRepository(repoData);
    }
}
