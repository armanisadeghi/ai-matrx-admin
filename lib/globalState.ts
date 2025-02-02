// globalState.ts
let globalUserId: string | null = null;

export const setGlobalUserId = (id: string) => {
    globalUserId = id;
    console.log('globalUserId:', globalUserId);
};

export const getGlobalUserId = () => globalUserId;