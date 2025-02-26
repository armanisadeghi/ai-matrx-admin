import {indexedDBStore} from "@/app/kelvin/code-editor/version-3/utils";

const store = indexedDBStore;

export const useEditorSave = (editorRef, repoName, filename, setIsLoading) => {
    const saveFileContent = async () => {
        if (editorRef.current) {
            setIsLoading(true);
            const currentContent = editorRef.current.getValue();
            try {
                await store.saveFileContent(repoName, filename, currentContent);
                console.log(`File ${filename} saved to IndexedDB`);
            } catch (error) {
                console.error(`Error saving file ${filename}:`, error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return { saveFileContent };
};
