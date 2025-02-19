import {Loader2, Terminal as TerminalIcon} from 'lucide-react';

interface TerminalProps {
    output: {
        stdout: string;
        stderr: string;
        fullOutput: string;
    } | null;
    loading: boolean;
    error?: string;
}

const Terminal = ({ output, loading, error }: TerminalProps) => {
    return (
        <div className="h-full font-mono bg-gray-900 overflow-hidden">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-b border-gray-700">
                <div className="flex items-center space-x-3">
                    <TerminalIcon className="w-4 h-4 text-gray-400" />
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-300">Terminal</span>
                        {loading && (
                            <span className="flex items-center gap-2 text-xs text-gray-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Executing...
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Terminal Content */}
            <div className="p-4 h-[calc(100%-40px)] overflow-auto">
                {loading ? (
                    <div className="flex items-center text-emerald-400">
                        <span className="font-bold mr-2">$</span>
                        <span className="font-medium">Executing code...</span>
                    </div>
                ) : error ? (
                    <div className="space-y-2">
                        <div className="flex items-center text-red-400">
                            <span className="font-bold mr-2">$</span>
                            <span className="font-medium">Error occurred</span>
                        </div>
                        <div className="ml-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <pre className="text-red-400 text-sm">{error}</pre>
                        </div>
                    </div>
                ) : output ? (
                    <div className="space-y-4">
                        {output.stdout && (
                            <div className="space-y-2">
                                <div className="flex items-center text-emerald-400">
                                    <span className="font-bold mr-2">$</span>
                                    <span className="font-medium">Output</span>
                                </div>
                                <div className="ml-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                    <pre className="text-emerald-400 text-sm whitespace-pre-wrap">{output.stdout}</pre>
                                </div>
                            </div>
                        )}
                        {output.stderr && (
                            <div className="space-y-2">
                                <div className="flex items-center text-red-400">
                                    <span className="font-bold mr-2">$</span>
                                    <span className="font-medium">Errors</span>
                                </div>
                                <div className="ml-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <pre className="text-red-400 text-sm whitespace-pre-wrap">{output.stderr}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center text-gray-500">
                        <span className="font-bold mr-2">$</span>
                        <span className="font-medium">Ready to execute code...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Terminal;