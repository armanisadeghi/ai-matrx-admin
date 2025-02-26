export type IRepoContent = {
    name: string;
    type: string;
    content?: string;
    path: string;
};

export interface IRepoData {
    name: string; // Repository name
    description?: string;
    files: { [path: string]: string }; // Key-value pair of file paths and content
    githubUrl?: string;
}
