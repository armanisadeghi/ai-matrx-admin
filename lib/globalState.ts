// globalState.ts
let globalUserId: string | null = null;
let globalAccessToken: string | null = null;

export const setGlobalUserIdAndToken = (id: string, token: string) => {
    globalUserId = id;
    globalAccessToken = token;
};

export const getGlobalUserIdAndToken = () => ({
    userId: globalUserId,
    token: globalAccessToken,
});

export const getGlobalUserId = () => globalUserId;
export const getGlobalAccessToken = () => globalAccessToken;

