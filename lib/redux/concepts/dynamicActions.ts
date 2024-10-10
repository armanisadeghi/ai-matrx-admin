// Utility to create action types dynamically
export const createActionTypes = (base: string) => ({
    FETCH_ALL_REQUEST: `${base}/FETCH_ALL_REQUEST`,
    FETCH_ALL_SUCCESS: `${base}/FETCH_ALL_SUCCESS`,
    FETCH_ALL_FAILURE: `${base}/FETCH_ALL_FAILURE`,

    FETCH_PAGINATED_REQUEST: `${base}/FETCH_PAGINATED_REQUEST`,
    FETCH_PAGINATED_SUCCESS: `${base}/FETCH_PAGINATED_SUCCESS`,
    FETCH_PAGINATED_FAILURE: `${base}/FETCH_PAGINATED_FAILURE`,

    CREATE_REQUEST: `${base}/CREATE_REQUEST`,
    CREATE_SUCCESS: `${base}/CREATE_SUCCESS`,
    CREATE_FAILURE: `${base}/CREATE_FAILURE`,

    INSERT_SIMPLE_REQUEST: `${base}/INSERT_SIMPLE_REQUEST`,
    INSERT_SIMPLE_SUCCESS: `${base}/INSERT_SIMPLE_SUCCESS`,
    INSERT_SIMPLE_FAILURE: `${base}/INSERT_SIMPLE_FAILURE`,

    INSERT_WITH_FK_REQUEST: `${base}/INSERT_WITH_FK_REQUEST`,
    INSERT_WITH_FK_SUCCESS: `${base}/INSERT_WITH_FK_SUCCESS`,
    INSERT_WITH_FK_FAILURE: `${base}/INSERT_WITH_FK_FAILURE`,

    INSERT_WITH_IFK_REQUEST: `${base}/INSERT_WITH_IFK_REQUEST`,
    INSERT_WITH_IFK_SUCCESS: `${base}/INSERT_WITH_IFK_SUCCESS`,
    INSERT_WITH_IFK_FAILURE: `${base}/INSERT_WITH_IFK_FAILURE`,

    INSERT_WITH_FK_AND_IFK_REQUEST: `${base}/INSERT_WITH_FK_AND_IFK_REQUEST`,
    INSERT_WITH_FK_AND_IFK_SUCCESS: `${base}/INSERT_WITH_FK_AND_IFK_SUCCESS`,
    INSERT_WITH_FK_AND_IFK_FAILURE: `${base}/INSERT_WITH_FK_AND_IFK_FAILURE`,

    UPDATE_REQUEST: `${base}/UPDATE_REQUEST`,
    UPDATE_SUCCESS: `${base}/UPDATE_SUCCESS`,
    UPDATE_FAILURE: `${base}/UPDATE_FAILURE`,

    DELETE_REQUEST: `${base}/DELETE_REQUEST`,
    DELETE_SUCCESS: `${base}/DELETE_SUCCESS`,
    DELETE_FAILURE: `${base}/DELETE_FAILURE`,

    EXECUTE_QUERY_REQUEST: `${base}/EXECUTE_QUERY_REQUEST`,
    EXECUTE_QUERY_SUCCESS: `${base}/EXECUTE_QUERY_SUCCESS`,
    EXECUTE_QUERY_FAILURE: `${base}/EXECUTE_QUERY_FAILURE`,
});

// Creating action types for a specific function
const actionTypes = createActionTypes('registeredFunction');


// Function to create actions based on action types
export const createActions = (actionTypes: any) => ({
    // Actions for fetchAll
    fetchAllRequest: (params?: any) => ({ type: actionTypes.FETCH_ALL_REQUEST, payload: params }),
    fetchAllSuccess: (data: any[]) => ({ type: actionTypes.FETCH_ALL_SUCCESS, payload: data }),
    fetchAllFailure: (error: any) => ({ type: actionTypes.FETCH_ALL_FAILURE, payload: error }),

    // Actions for fetchPaginated
    fetchPaginatedRequest: (params?: any) => ({ type: actionTypes.FETCH_PAGINATED_REQUEST, payload: params }),
    fetchPaginatedSuccess: (data: any[], count: number) => ({ type: actionTypes.FETCH_PAGINATED_SUCCESS, payload: { data, count } }),
    fetchPaginatedFailure: (error: any) => ({ type: actionTypes.FETCH_PAGINATED_FAILURE, payload: error }),

    // Actions for create
    createRequest: (data: any) => ({ type: actionTypes.CREATE_REQUEST, payload: data }),
    createSuccess: (data: any) => ({ type: actionTypes.CREATE_SUCCESS, payload: data }),
    createFailure: (error: any) => ({ type: actionTypes.CREATE_FAILURE, payload: error }),

    // Actions for insertSimple
    insertSimpleRequest: (data: any) => ({ type: actionTypes.INSERT_SIMPLE_REQUEST, payload: data }),
    insertSimpleSuccess: (data: any) => ({ type: actionTypes.INSERT_SIMPLE_SUCCESS, payload: data }),
    insertSimpleFailure: (error: any) => ({ type: actionTypes.INSERT_SIMPLE_FAILURE, payload: error }),

    // Actions for insertWithFk
    insertWithFkRequest: (data: any) => ({ type: actionTypes.INSERT_WITH_FK_REQUEST, payload: data }),
    insertWithFkSuccess: (data: any) => ({ type: actionTypes.INSERT_WITH_FK_SUCCESS, payload: data }),
    insertWithFkFailure: (error: any) => ({ type: actionTypes.INSERT_WITH_FK_FAILURE, payload: error }),

    // Actions for insertWithIfk
    insertWithIfkRequest: (data: any) => ({ type: actionTypes.INSERT_WITH_IFK_REQUEST, payload: data }),
    insertWithIfkSuccess: (data: any) => ({ type: actionTypes.INSERT_WITH_IFK_SUCCESS, payload: data }),
    insertWithIfkFailure: (error: any) => ({ type: actionTypes.INSERT_WITH_IFK_FAILURE, payload: error }),

    // Actions for insertWithFkAndIfk
    insertWithFkAndIfkRequest: (data: any) => ({ type: actionTypes.INSERT_WITH_FK_AND_IFK_REQUEST, payload: data }),
    insertWithFkAndIfkSuccess: (data: any) => ({ type: actionTypes.INSERT_WITH_FK_AND_IFK_SUCCESS, payload: data }),
    insertWithFkAndIfkFailure: (error: any) => ({ type: actionTypes.INSERT_WITH_FK_AND_IFK_FAILURE, payload: error }),

    // Actions for update
    updateRequest: (id: string, data: any) => ({ type: actionTypes.UPDATE_REQUEST, payload: { id, data } }),
    updateSuccess: (data: any) => ({ type: actionTypes.UPDATE_SUCCESS, payload: data }),
    updateFailure: (error: any) => ({ type: actionTypes.UPDATE_FAILURE, payload: error }),

    // Actions for delete
    deleteRequest: (id: string) => ({ type: actionTypes.DELETE_REQUEST, payload: id }),
    deleteSuccess: (id: string) => ({ type: actionTypes.DELETE_SUCCESS, payload: id }),
    deleteFailure: (error: any) => ({ type: actionTypes.DELETE_FAILURE, payload: error }),

    // Actions for executeQuery
    executeQueryRequest: (query: any) => ({ type: actionTypes.EXECUTE_QUERY_REQUEST, payload: query }),
    executeQuerySuccess: (data: any[]) => ({ type: actionTypes.EXECUTE_QUERY_SUCCESS, payload: data }),
    executeQueryFailure: (error: any) => ({ type: actionTypes.EXECUTE_QUERY_FAILURE, payload: error }),
});

const actions = createActions(actionTypes);
