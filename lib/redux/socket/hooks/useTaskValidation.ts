// File Location: lib/redux/socket/hooks/useTaskValidation.ts

import { useEffect } from 'react';
import { TASK_CONTEXT_VALIDATION } from '../constants/task-context';

export const useTaskValidation = (tasks: any[]) => {
    useEffect(() => {
        const validateTask = (task: any) => {
            const validation = TASK_CONTEXT_VALIDATION[task.task];
            if (!validation) {
                console.log(`No validation rules found for task: ${task.task}`);
                return;
            }

            Object.entries(validation).forEach(([field, rules]: [string, any]) => {
                const value = task.taskData[field];

                if (rules.required && !value) {
                    console.log(`Required field ${field} is missing for task: ${task.task}`);
                }

                if (value && rules.data_type) {
                    const actualType = typeof value;
                    if (actualType !== rules.data_type) {
                        console.log(`Field ${field} should be ${rules.data_type} but got ${actualType}`);
                    }
                }
            });
        };

        tasks.forEach(validateTask);
    }, [tasks]);
};
