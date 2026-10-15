import { fetchScheduledTask } from "../redux/tasks/thunks";
import { updateComputerCodingTask } from "./queries";

/**
 * Save an edited coding schedule on a computer, then refetch its row into the store: the detail page
 * reads the store, so without the refetch it shows the schedule as it was before the edit (re-walk D4).
 */
export async function saveComputerCodingEdit(
  dispatch: (action: unknown) => unknown,
  task: Parameters<typeof updateComputerCodingTask>[0],
  edit: Parameters<typeof updateComputerCodingTask>[1],
): Promise<void> {
  await updateComputerCodingTask(task, edit);
  await dispatch(fetchScheduledTask(task.id));
}
