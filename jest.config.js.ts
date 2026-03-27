// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
    },
    transformIgnorePatterns: [
        "/node_modules/(?!uuid).+\\.js$",
    ],
};
