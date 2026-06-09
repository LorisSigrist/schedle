import { describe, expect, it } from 'vitest';
import type { Schedule, Task } from './interface';
import { RoundRobinScheduler } from './round_robin';

describe('RoundRobinScheduler', () => {
    it('breaks matching release-time ties by choosing the higher displayed task first', () => {
        const scheduler = new RoundRobinScheduler();
        const tasks: Task[] = [
            { id: 1, name: 'Higher displayed task', worst_case_execution_time: 2, period: 4, deadline: 4 },
            { id: 2, name: 'Lower displayed task', worst_case_execution_time: 1, period: 4, deadline: 4 },
            { id: 3, name: 'Longer period task', worst_case_execution_time: 1, period: 8, deadline: 8 }
        ];

        const schedule = scheduler.schedule(tasks);

        expect(expandSchedule(schedule)).toEqual([1, 2, 3, 1, 1, 2, 1, undefined]);
    });

    it('switches from the previously running job when another task is released', () => {
        const scheduler = new RoundRobinScheduler();
        const tasks: Task[] = [
            { id: 1, name: 'Short period task', worst_case_execution_time: 1, period: 3, deadline: 3 },
            { id: 2, name: 'Long running task', worst_case_execution_time: 3, period: 4, deadline: 4 }
        ];

        const schedule = scheduler.schedule(tasks);

        expect(expandSchedule(schedule).slice(0, 5)).toEqual([1, 2, 2, 1, 2]);
    });
});

function expandSchedule(schedule: Schedule): Array<number | undefined> {
    return schedule.entries.flatMap((entry) => Array(entry.allocatedTime).fill(entry.taskId));
}
