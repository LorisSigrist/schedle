import type { Scheduler, Schedule, Task } from './interface.js';
import type { Job } from './simulation.js';
import { simulatePeriodicSchedule } from './simulation.js';

export class RoundRobinScheduler implements Scheduler {
    name = 'Round Robin Scheduler';

    schedule(tasks: ReadonlyArray<Readonly<Task>>): Schedule {
        let queuedJobs: Job[] = [];
        let previouslySelectedJob: Job | undefined;

        return simulatePeriodicSchedule(tasks, {
            chooseJob: (readyJobs) => {
                queuedJobs = queuedJobs.filter((job) => readyJobs.includes(job));

                const newJobs = readyJobs
                    .filter((job) => job !== previouslySelectedJob && !queuedJobs.includes(job))
                    .toSorted((a, b) => a.releaseTime - b.releaseTime || taskIndex(tasks, a.task.id) - taskIndex(tasks, b.task.id));
                queuedJobs.push(...newJobs);

                if (previouslySelectedJob && readyJobs.includes(previouslySelectedJob)) {
                    queuedJobs.push(previouslySelectedJob);
                }
                previouslySelectedJob = undefined;

                const selectedJob = queuedJobs.shift();
                if (!selectedJob) {
                    return undefined;
                }

                previouslySelectedJob = selectedJob;

                return selectedJob;
            }
        });
    }
}

function taskIndex(tasks: ReadonlyArray<Readonly<Task>>, taskId: number): number {
    return tasks.findIndex((task) => task.id === taskId);
}
