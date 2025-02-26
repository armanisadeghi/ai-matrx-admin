// File Location: app/(authenticated)/tests/socket-tests/modular-recipe-socket/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { RecipeSocketHeader } from '@/components/socket/recipes/RecipeSocketHeader';
import { SocketTaskComponent } from '@/components/socket/tasks/SocketTask';
import { SocketActions } from '@/components/socket/actions/SocketActions';
import { SocketResponse } from '@/components/socket/response/SocketResponse';
import { useRecipeSocket } from '@/lib/redux/socket/hooks/legacy/useRecipeSocket';

export default function Page() {
    const {
        namespace,
        setNamespace,
        event,
        setEvent,
        streamEnabled,
        setStreamEnabled,
        tasks,
        streamingResponse,
        responses,
        responseRef,
        loadRecipeData,
        addTask,
        removeTask,
        updateTask,
        updateTaskData,
        updateBroker,
        handleSend,
        handleClear,
        isResponseActive,
        isConnected,
        isAuthenticated,
    } = useRecipeSocket();

    return (
        <div className="p-2 w-full">
            <Card>
                <CardHeader>
                    <CardTitle>Socket.IO Tester</CardTitle>
                </CardHeader>
                <CardContent>
                    <RecipeSocketHeader
                        namespace={namespace}
                        event={event}
                        streamEnabled={streamEnabled}
                        setNamespace={setNamespace}
                        setEvent={setEvent}
                        setStreamEnabled={setStreamEnabled}
                        isConnected={isConnected}
                        isAuthenticated={isAuthenticated}
                    />

                    <div className="space-y-4">
                        {tasks.map((task, taskIndex) => (
                            <Card key={taskIndex} className="p-4">
                                <SocketTaskComponent
                                    task={task}
                                    taskIndex={taskIndex}
                                    removeTask={removeTask}
                                    updateTask={updateTask}
                                    loadRecipeData={loadRecipeData}
                                    updateTaskData={updateTaskData}
                                    updateBroker={updateBroker}
                                />
                            </Card>
                        ))}

                        <SocketActions
                            onAddTask={addTask}
                            onSend={handleSend}
                            onClear={handleClear}
                        />
                    </div>
                </CardContent>
            </Card>

            <SocketResponse
                streamingResponse={streamingResponse}
                responses={responses}
                responseRef={responseRef}
                isResponseActive={isResponseActive}
            />
        </div>
    );
}
