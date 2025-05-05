// globalState.ts
let globalUserId: string | null = null;
let globalAccessToken: string | null = null;
let globalIsAdmin: boolean = false;


export const setGlobalUserIdAndToken = (id: string, token: string, isAdmin: boolean) => {
    globalUserId = id;
    globalAccessToken = token;
    globalIsAdmin = isAdmin;
};

export const getGlobalUserIdAndToken = () => ({
    userId: globalUserId,
    token: globalAccessToken,
    isAdmin: globalIsAdmin,
});

export const getGlobalUserId = () => globalUserId;
export const getGlobalAccessToken = () => globalAccessToken;
export const getGlobalIsAdmin = () => globalIsAdmin;
