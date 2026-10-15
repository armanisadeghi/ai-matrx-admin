import base from "./jest.config.ts";
export default { ...base, moduleNameMapper: { "^@ai-matrx/kit/sha256$": "/Users/armanisadeghi/code/matrx-frontend/node_modules/.pnpm/@ai-matrx+kit@0.45.3_@typescript+typescript6@6.0.2_react@19.3.0/node_modules/@ai-matrx/kit/dist/sha256.js", ...(base as any).moduleNameMapper } };
