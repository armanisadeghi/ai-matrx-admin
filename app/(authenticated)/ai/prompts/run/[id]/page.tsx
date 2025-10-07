export default async function RunPromptPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Run Prompt</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Prompt ID: {id}</p>
        </div>
    );
}

