/*
// __tests__/selectors.test.ts
import { selectorsConfig } from '@/app/(authenticated)/tests/selector-test/dynamic-test/selectorsConfig';
import baseline from '@/app/(authenticated)/tests/selector-test/dynamic-test/baseline.json';
import { createTestStore } from './testUtils';

describe("Selectors Test", () => {
    // Initialize the test store
    const store = createTestStore();

    baseline.forEach(({ name, props, result: expectedResult }) => {
        const selectorConfig = selectorsConfig.find((config) => config.name === name);

        test(`Testing selector ${name}`, () => {
            if (!selectorConfig) {
                throw new Error(`Selector ${name} not found in selectorsConfig`);
            }

            const { selectorFn, isObjectArgs } = selectorConfig;
            // Call selector with the mock state
            const result = isObjectArgs
                           ? selectorFn(store.getState(), ...props)
                           : selectorFn(store.getState(), props[0]);

            // Compare result to expected baseline
            expect(result).toEqual(expectedResult);
        });
    });
});
*/
