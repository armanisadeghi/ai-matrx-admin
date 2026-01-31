import { compose, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
// @ts-ignore - cacheMiddleware.ts is not a module (file is commented out)
import { createCacheMiddleware } from './cacheMiddleware';

// Middleware types
interface MiddlewareConfig {
    cache?: boolean;
    api?: boolean;
    schema?: boolean;
    form?: boolean;
    query?: boolean;
}

// Create middleware orchestrator
export const createMiddlewareOrchestrator = (config: MiddlewareConfig = {}) => {
    const sagaMiddleware = createSagaMiddleware();
    const middlewares = [];

    // Add core middleware
    middlewares.push(sagaMiddleware);

    // Add cache middleware if enabled
    if (config.cache) {
        // @ts-ignore - createCacheMiddleware not yet implemented (cacheMiddleware.ts is commented out)
        middlewares.push(
            createCacheMiddleware({
                ttl: 5 * 60 * 1000,
                storage: 'memory',
                invalidateOn: ['INVALIDATE_CACHE', 'LOGOUT']
            })
        );
    }

    // // Add API middleware
    // if (config.api) {
    //     middlewares.push(createApiMiddleware());
    // }
    //
    // // Add schema middleware
    // if (config.schema) {
    //     middlewares.push(createSchemaMiddleware());
    // }
    //
    // // Add form middleware
    // if (config.form) {
    //     middlewares.push(createFormMiddleware());
    // }
    //
    // // Add query middleware
    // if (config.query) {
    //     middlewares.push(createQueryMiddleware());
    // }

    return {
        middlewareEnhancer: applyMiddleware(...middlewares),
        sagaMiddleware,
        runSaga: sagaMiddleware.run
    };
};

// // Usage example with Redux store
// const configureStore = () => {
//     const { middlewareEnhancer, sagaMiddleware, runSaga } = createMiddlewareOrchestrator({
//         cache: true,
//         api: true,
//         schema: true,
//         form: true,
//         query: true
//     });
//
//     const store = createStore(
//         rootReducer,
//         compose(middlewareEnhancer)
//     );
//
//     // Run root saga
//     runSaga(rootSaga);
//
//     return store;
// };
//
// // Example saga usage with caching
// function* exampleSaga(action: AnyAction) {
//     try {
//         // Use the caching saga wrapper
//         const result = yield* cachingSaga(action, function* () {
//             const data = yield call(api.fetchData);
//             yield put({ type: 'FETCH_SUCCESS', payload: data });
//             return data;
//         });
//
//         return result;
//     } catch (error) {
//         yield put({ type: 'FETCH_ERROR', error });
//     }
// }


// // Usage Example:
// // Action creator with cache
// const fetchData = () => ({
//     type: 'FETCH_DATA',
//     meta: {
//         cache: true
//     }
// });
//
// // Saga with cache
// function* dataSaga() {
//     yield* cachingSaga({ type: 'FETCH_DATA' }, function* () {
//         const data = yield call(api.fetchData);
//         return data;
//     });
// }
