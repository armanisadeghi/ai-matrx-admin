// lib/redux/socket/recipe-task-manager.ts
import { SocketManager } from "../manager";
import { RecipeTaskData } from "./RecipeTaskData";

export class RecipeTaskManager {
    private static readonly SERVICE = "simple_recipe";
    private static readonly TASK = "run_recipe";
    private socketManager: SocketManager;

    constructor() {
        this.socketManager = SocketManager.getInstance();
    }

    async runRecipeTasks(tasks: RecipeTaskData[]): Promise<string[]> {
        try {
            const socket = await this.socketManager.getSocket();
            const taskArray = tasks.map(task => task.getTask());
            
            await this.socketManager.emit(RecipeTaskManager.SERVICE, taskArray);

            return taskArray.map(task => {
                const sid = socket.id || "pending";
                return `${sid}_${RecipeTaskManager.TASK}_${task.index}`;
            });
        } catch (error) {
            console.error("[RECIPE TASK MANAGER] Failed to run tasks:", error);
            throw error;
        }
    }

    async runRecipeTask(task: RecipeTaskData): Promise<string> {
        const eventNames = await this.runRecipeTasks([task]);
        return eventNames[0];
    }

    getSocketManager(): SocketManager {
        return this.socketManager;
    }
}