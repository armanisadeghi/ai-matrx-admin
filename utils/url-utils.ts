// utils/url-utils.ts

export function cleanUrl(url: string) {
    try {
        const parsedUrl = new URL(url);
        const params = new URLSearchParams(parsedUrl.search);
        const keepers = ["p", "q", "id"];
        const cleanedParams = new URLSearchParams();

        for (const [key, value] of params) {
            if (keepers.includes(key)) {
                cleanedParams.set(key, value);
            }
        }

        parsedUrl.search = cleanedParams.toString();
        return parsedUrl.toString();
    } catch (error) {
        return url;
    }
}
