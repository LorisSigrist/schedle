import type { Scheduler, Schedule, Task } from './interface.js';
import { simulatePeriodicSchedule } from './simulation.js';

export class RateMonotonicScheduler implements Scheduler {
    name = 'Rate Monotonic Scheduler';

    schedule(tasks: ReadonlyArray<Readonly<Task>>): Schedule {
        return simulatePeriodicSchedule(tasks, {
            chooseJob: (readyJobs) =>
                readyJobs.toSorted((a, b) => a.task.period - b.task.period || a.task.id - b.task.id)[0]
        });
    }
}
