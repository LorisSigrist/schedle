import { describe, it, expect } from 'vitest';
import type { Scheduler } from './interface';
import { RateMonotonicScheduler } from './rate_monotonic';
import { RoundRobinScheduler } from './round_robin';
import { EarliestDeadlineFirstScheduler } from './earliest_deadline_first';

defineSchedulerInterfaceTests(() => new RateMonotonicScheduler());
defineSchedulerInterfaceTests(() => new RoundRobinScheduler());
defineSchedulerInterfaceTests(() => new EarliestDeadlineFirstScheduler());

function defineSchedulerInterfaceTests(createScheduler: () => Scheduler) {
    const scheduler = createScheduler();
    
    describe(`Scheduler Interface Adherence Tests for ${scheduler.name}`, () => {
        it('should not modify the tasks array when scheduling a task', () => {
            const scheduler = createScheduler();
            const tasks = [
                { id: 1, name: 'Task 1', worst_case_execution_time: 3, period: 5, deadline: 5 },
                { id: 2, name: 'Task 2', worst_case_execution_time: 2, period: 10, deadline: 10 }
            ];
            const tasksCopy = JSON.parse(JSON.stringify(tasks)); // Deep copy of tasks
            scheduler.schedule(tasks);
            expect(tasks).toEqual(tasksCopy); // Ensure original tasks array is unchanged
        });

        it("should return a schedule, whose entries durations sum up to the number of quanta after which the schedule repeats itself", () => {
            const scheduler = createScheduler();
            const tasks = [
                { id: 1, name: 'Task 1', worst_case_execution_time: 3, period: 5, deadline: 5 },
                { id: 2, name: 'Task 2', worst_case_execution_time: 2, period: 10, deadline: 10 }
            ];
            const schedule = scheduler.schedule(tasks);
            const totalAllocatedTime = schedule.entries.reduce((sum, entry) => sum + entry.allocatedTime, 0);
            expect(totalAllocatedTime).toBe(schedule.quanta);
        });
    });
}