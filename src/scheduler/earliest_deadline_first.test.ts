import { describe, expect, it } from 'vitest';
import { EarliestDeadlineFirstScheduler } from './earliest_deadline_first';
import type { Schedule, Task } from './interface';

describe('EarliestDeadlineFirstScheduler', () => {
    it('breaks matching deadline ties by choosing the task with the lower period', () => {
        const scheduler = new EarliestDeadlineFirstScheduler();
        const tasks: Task[] = [
            { id: 1, name: 'Lower frequency task', worst_case_execution_time: 1, period: 6, deadline: 6 },
            { id: 2, name: 'Higher frequency task', worst_case_execution_time: 1, period: 4, deadline: 6 }
        ];

        const schedule = scheduler.schedule(tasks);

        expect(expandSchedule(schedule).slice(0, 2)).toEqual([2, 1]);
    });
});

function expandSchedule(schedule: Schedule): Array<number | undefined> {
    return schedule.entries.flatMap((entry) => Array(entry.allocatedTime).fill(entry.taskId));
}
