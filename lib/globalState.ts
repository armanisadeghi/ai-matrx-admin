// globalState.ts
let globalUserId: string | null = null;

export const setGlobalUserId = (id: string) => {
    globalUserId = id;
};

export const getGlobalUserId = () => globalUserId;