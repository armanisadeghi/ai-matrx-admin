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
            const taskArray = tasks.map(task => task.getTask());
            
            await new Promise<void>((resolve, reject) => {
                this.socketManager.getSocket().emit(RecipeTaskManager.SERVICE, taskArray, (response: any) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve();
                    }
                });
            });

            // Return expected response event names
            return taskArray.map(task => {
                const sid = this.socketManager.getSocket().id;
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