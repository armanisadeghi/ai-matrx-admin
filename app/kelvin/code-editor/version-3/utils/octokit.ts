import { Octokit } from "@octokit/rest";

let octokit: Octokit | null = null;

export async function getOctokit() {
    if (octokit) return octokit;

    const response = await fetch("/api/github-token");
    if (!response.ok) {
        throw new Error("Failed to get GitHub token");
    }

    const { accessToken } = await response.json();

    octokit = new Octokit({
        auth: accessToken,
        baseUrl: "https://api.github.com",
    });

    return octokit;
}
export const setOctokitToken = (token: string) => {
    octokit.auth(token);
};
