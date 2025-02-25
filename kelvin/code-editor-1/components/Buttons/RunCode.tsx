import { Button } from "@/app/dashboard/code-editor/components";

interface RunCodeProps {
    loading?: boolean;
    onRunCode: () => Promise<void>;
}

export const RunCode: React.FC<RunCodeProps> = ({ onRunCode, loading }) => {
    return (
        <div>
            <Button onClick={onRunCode} loading={loading}>
                {loading ? "Running..." : "Run Code"}
            </Button>
        </div>
    );
};
