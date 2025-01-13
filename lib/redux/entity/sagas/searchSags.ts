// import { EntityKeys } from "@/types";
// import { BaseSagaContext } from "./sagaHelpers";
// import EntityLogger from "../utils/entityLogger";
// import { createAction } from "@reduxjs/toolkit";
// import { select } from "redux-saga/effects";
// import { selectFrontendConversion } from "../../schema/globalCacheSelectors";

// // Types
// interface SearchPayload {
//     searchField: string;
//     searchValue: string;
//     pageNumber?: number;
//     pageSize?: number;
//   }
  
//   interface SearchResponse {
//     result: any;
//     total_count: number;
//   }
  
//   interface SearchSagaContext<TEntity extends EntityKeys> extends BaseSagaContext<TEntity> {
//     tableName: string;
//   }
  
//   // Action creators
//   const createSearchActions = (prefix: string) => ({
//     search: createAction(`${prefix}/SEARCH`, 
//       (payload: SearchPayload) => ({ payload })),
//     searchSuccess: createAction(`${prefix}/SEARCH_SUCCESS`,
//       (payload: { data: any[], totalCount: number }) => ({ payload })),
//     searchError: createAction(`${prefix}/SEARCH_ERROR`,
//       (error: { message: string; code?: string }) => ({ payload: error }))
//   });
  
//   // Saga implementation
//   function* handleDynamicSearch<TEntity extends EntityKeys>({
//     entityKey,
//     actions,
//     api,
//     action,
//     tableName,
//     unifiedDatabaseObject
//   }: SearchSagaContext<TEntity>) {
//     const entityLogger = EntityLogger.createLoggerWithDefaults('handleDynamicSearch', entityKey);
  
//     try {
//       entityLogger.log('debug', 'Starting dynamic search', action.payload);
  
//       const { searchField, searchValue, pageNumber = 1, pageSize = 10 } = action.payload;
  
//       // Call the RPC function
//       const { data, error } = yield api.rpc('dynamic_search', {
//         p_table_name: tableName,
//         p_search_field: searchField,
//         p_search_value: searchValue,
//         p_page_number: pageNumber,
//         p_page_size: pageSize
//       });
  
//       if (error) throw error;
  
//       // Transform the response
//       const results = data.map((item: SearchResponse) => item.result);
//       const totalCount = data[0]?.total_count || 0;
  
//       // Convert for frontend if needed
//       const frontendResponse = yield select(selectFrontendConversion, {
//         entityName: entityKey,
//         data: results
//       });
  
//       entityLogger.log('debug', 'Search response', { results: frontendResponse, totalCount });
  
//       yield put(actions.searchSuccess({
//         data: frontendResponse,
//         totalCount
//       }));
  
//     } catch (error: any) {
//       entityLogger.log('error', 'Error in dynamic search', error);
//       yield put(actions.searchError({
//         message: error.message || "An error occurred during search.",
//         code: error.code,
//       }));
//       throw error;
//     }
//   }
  
//   // Usage example
//   const searchSaga = createSagaWithContext({
//     actionType: 'SEARCH',
//     handler: handleDynamicSearch,
//   });
  
//   // Redux slice example
//   const createSearchSlice = (name: string) => {
//     const searchActions = createSearchActions(name);
    
//     const initialState = {
//       searchResults: [],
//       totalCount: 0,
//       loading: false,
//       error: null as null | { message: string; code?: string }
//     };
  
//     return createSlice({
//       name,
//       initialState,
//       reducers: {},
//       extraReducers: (builder) => {
//         builder
//           .addCase(searchActions.search, (state) => {
//             state.loading = true;
//             state.error = null;
//           })
//           .addCase(searchActions.searchSuccess, (state, action) => {
//             state.searchResults = action.payload.data;
//             state.totalCount = action.payload.totalCount;
//             state.loading = false;
//           })
//           .addCase(searchActions.searchError, (state, action) => {
//             state.error = action.payload;
//             state.loading = false;
//           });
//       }
//     });
//   };
  
//   // Example usage in a component
//   /*
//   const dispatch = useDispatch();
  
//   dispatch(searchActions.search({
//     searchField: 'name',
//     searchValue: 'chicken',
//     pageNumber: 1,
//     pageSize: 10
//   }));
//   */