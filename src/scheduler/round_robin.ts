import type { Scheduler, Schedule, Task } from './interface.js';
import { simulatePeriodicSchedule } from './simulation.js';

export class RoundRobinScheduler implements Scheduler {
    name = 'Round Robin Scheduler';

    schedule(tasks: ReadonlyArray<Readonly<Task>>): Schedule {
        let nextTaskIndex = 0;

        return simulatePeriodicSchedule(tasks, {
            chooseJob: (readyJobs) => {
                if (readyJobs.length === 0) {
                    return undefined;
                }

                const selectedJob =
                    readyJobs.find((job) => taskIndex(tasks, job.task.id) >= nextTaskIndex) ?? readyJobs[0];
                nextTaskIndex = (taskIndex(tasks, selectedJob.task.id) + 1) % tasks.length;

                return selectedJob;
            }
        });
    }
}

function taskIndex(tasks: ReadonlyArray<Readonly<Task>>, taskId: number): number {
    return tasks.findIndex((task) => task.id === taskId);
}
