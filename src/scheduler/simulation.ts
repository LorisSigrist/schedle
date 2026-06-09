import type { Schedule, ScheduleEntry, Task } from './interface.js';

export type Job = {
    task: Readonly<Task>;
    releaseTime: number;
    absoluteDeadline: number;
    remainingTime: number;
};

type SimulationOptions = {
    chooseJob(readyJobs: Job[], time: number): Job | undefined;
};

export function simulatePeriodicSchedule(
    tasks: ReadonlyArray<Readonly<Task>>,
    { chooseJob }: SimulationOptions
): Schedule {
    if (tasks.length === 0) {
        return { entries: [], quanta: 0 };
    }

    const quanta = tasks.map((task) => task.period).reduce(lcm);
    const jobs: Job[] = [];
    const entries: ScheduleEntry[] = [];

    for (let time = 0; time < quanta; time++) {
        for (const task of tasks) {
            if (time % task.period === 0) {
                jobs.push({
                    task,
                    releaseTime: time,
                    absoluteDeadline: time + task.deadline,
                    remainingTime: task.worst_case_execution_time
                });
            }
        }

        const readyJobs = jobs.filter((job) => job.releaseTime <= time && job.remainingTime > 0);
        const selectedJob = chooseJob(readyJobs, time);
        appendEntry(entries, selectedJob?.task.id);

        if (selectedJob) {
            selectedJob.remainingTime -= 1;
        }
    }

    return { entries, quanta };
}

function appendEntry(entries: ScheduleEntry[], taskId: number | undefined) {
    const previousEntry = entries.at(-1);
    if (previousEntry && previousEntry.taskId === taskId) {
        previousEntry.allocatedTime += 1;
        return;
    }

    entries.push({ taskId, allocatedTime: 1 });
}

function gcd(a: number, b: number): number {
    while (b !== 0) {
        const next = a % b;
        a = b;
        b = next;
    }

    return a;
}

function lcm(a: number, b: number): number {
    return (a * b) / gcd(a, b);
}
