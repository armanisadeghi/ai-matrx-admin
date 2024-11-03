/*
// Example usage with schema awareness
export const processFunctionAction = createCustomAction({
    name: 'processFunction',
    label: (data) => `Process ${getDisplayField(data)}`,
    icon: <Cog />,
    instructions: [
        {
            type: 'condition',
            payload: {
                condition: (context) => context.data.status === 'ready',
                onTrue: [
                    {
                        type: 'setState',
                        payload: { path: 'status', value: 'processing' }
                    },
                    {
                        type: 'socket',
                        payload: {
                            event: 'function:process',
                            data: (context) => ({
                                functionId: context.data.pmid // Using pmid instead of id
                            }),
                            waitForResponse: true
                        },
                        onSuccess: {
                            type: 'setState',
                            payload: { path: 'status', value: 'completed' }
                        },
                        onError: {
                            type: 'setState',
                            payload: { path: 'status', value: 'failed' }
                        }
                    }
                ],
                onFalse: {
                    type: 'dispatch',
                    payload: {
                        type: 'notification/show',
                        payload: { message: 'Function not ready' }
                    }
                }
            }
        }
    ],
    options: {
        confirmation: true,
        retry: { count: 3, delay: 1000 },
        rollback: true,
        logging: true
    }
});

// Complex Example with Multiple Steps
export const deployFunctionAction = createCustomAction({
    name: 'deployFunction',
    label: 'Deploy',
    icon: <Rocket />,
    instructions: [
        {
            type: 'sequence',
            payload: [
                {
                    type: 'transform',
                    payload: {
                        transformer: (data) => ({
                            ...data,
                            deploymentId: Date.now()
                        })
                    }
                },
                {
                    type: 'parallel',
                    payload: [
                        {
                            type: 'socket',
                            payload: {
                                event: 'function:prepare',
                                waitForResponse: true
                            }
                        },
                        {
                            type: 'saga',
                            payload: {
                                saga: 'deployment/prepare',
                                args: { id: 'deploymentId' }
                            }
                        }
                    ]
                },
                {
                    type: 'api',
                    payload: {
                        endpoint: '/api/deploy',
                        method: 'POST'
                    }
                },
                {
                    type: 'navigation',
                    payload: {
                        path: '/deployments',
                        params: { id: 'deploymentId' }
                    }
                }
            ]
        }
    ]
});
*!/
*/
