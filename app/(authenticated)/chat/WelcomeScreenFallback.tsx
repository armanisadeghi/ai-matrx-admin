function WelcomeScreenFallback() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100 glow-text glow-text-blue glow-sweep">
                    Chat. Reimagined.
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 glow-text glow-text-blue glow-sweep glow-sweep-delayed">
                    Artificial Intelligence with Matrx Superpowers.
                </p>
            </div>

            <div className="w-full max-w-3xl flex justify-center items-center">
                <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            </div>
        </div>
    );
}


// Creating a nicer loading spinner fallback for Suspense
export function WelcomeScreenFallbackBasic() {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 md:px-8">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-medium mb-2 text-gray-800 dark:text-gray-100">Chat. Reimagined.</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400">Artificial Intelligence with Matrx Superpowers.</p>
            </div>

            <div className="w-full max-w-3xl flex justify-center items-center">
                <div className="relative w-12 h-12">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-zinc-200 dark:border-zinc-800 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
            </div>
        </div>
    );
}


export default WelcomeScreenFallback;