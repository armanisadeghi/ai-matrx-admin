import React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Send, Copy } from "lucide-react";
import { useSelector } from "react-redux";
import { useAppDispatch } from "@/lib/redux";
import { selectTaskDataById } from "@/lib/redux/socket-io/selectors";
import { resetTaskData, validateTask } from "@/lib/redux/socket-io/slices/socketTasksSlice";
import { submitTask } from "@/lib/redux/socket-io/thunks/submitTaskThunk";
import { copyToClipboard } from "../utils/clipboard-utils";
import { RootState } from "@/lib/redux/store";

interface ActionButtonsProps {
    taskId: string;
    minimalSpace?: boolean;
    onSubmit?: (data: Record<string, any>) => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ 
    taskId, 
    minimalSpace = false,
    onSubmit
}) => {
    const dispatch = useAppDispatch();
    const formData = useSelector((state: RootState) => selectTaskDataById(state, taskId));

    const handleSubmit = () => {
        // Validate and then submit if the validation passes
        // Redux thunk will handle validation internally during submission
        dispatch(submitTask({ taskId }))
            .unwrap()
            .then(() => {
                if (onSubmit) {
                    onSubmit(formData);
                }
            })
            .catch(error => {
                console.error("Submit error:", error);
            });
    };

    const handleReset = () => {
        dispatch(resetTaskData(taskId));
    };

    const handleCopyToClipboard = () => {
        copyToClipboard(formData)
            .catch(err => {
                console.error("Failed to copy data: ", err);
            });
    };

    if (minimalSpace) {
        return (
            <div className="mt-3 flex justify-end gap-2">
                <Button
                    type="submit"
                    variant="default"
                    size="icon"
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg w-10 h-10"
                    onClick={handleSubmit}
                    title="Submit"
                >
                    <Send className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg w-10 h-10"
                    onClick={handleReset}
                    title="Reset"
                >
                    <RefreshCcw className="w-4 h-4" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg w-10 h-10"
                    onClick={handleCopyToClipboard}
                    title="Copy Data"
                >
                    <Copy className="w-4 h-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className="mt-3 flex justify-end gap-4">
            <Button
                type="submit"
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                onClick={handleSubmit}
            >
                <Send className="w-4 h-4 mr-1" />
                Submit
            </Button>
            <Button
                variant="outline"
                className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                onClick={handleReset}
            >
                <RefreshCcw className="w-4 h-4 mr-1" />
                Reset
            </Button>
            <Button
                variant="outline"
                className="border-gray-500 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                onClick={handleCopyToClipboard}
            >
                <Copy className="w-4 h-4 mr-1" />
                Copy Data
            </Button>
        </div>
    );
};

export default React.memo(ActionButtons); 