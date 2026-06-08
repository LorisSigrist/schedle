import type { Scheduler, Schedule, Task } from './interface.js';
import { simulatePeriodicSchedule } from './simulation.js';

export class EarliestDeadlineFirstScheduler implements Scheduler {
    name = 'Earliest Deadline First Scheduler';
    
    schedule(tasks: ReadonlyArray<Readonly<Task>>): Schedule {
        return simulatePeriodicSchedule(tasks, {
            chooseJob: (readyJobs) =>
                readyJobs.toSorted(
                    (a, b) =>
                        a.absoluteDeadline - b.absoluteDeadline ||
                        a.task.period - b.task.period ||
                        a.releaseTime - b.releaseTime ||
                        a.task.id - b.task.id
                )[0]
        });
    }
}
