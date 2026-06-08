import type { Schedule, ScheduleEntry, Scheduler, Task } from "./scheduler/interface";
import { EarliestDeadlineFirstScheduler } from "./scheduler/earliest_deadline_first";
import { RateMonotonicScheduler } from "./scheduler/rate_monotonic";
import { RoundRobinScheduler } from "./scheduler/round_robin";

export type SchedulerId = "rate-monotonic" | "earliest-deadline-first" | "round-robin";

export type PuzzleState = {
    scheduler: SchedulerId;
    tasks: Task[];
};

export const schedulers: Record<SchedulerId, () => Scheduler> = {
    "rate-monotonic": () => new RateMonotonicScheduler(),
    "earliest-deadline-first": () => new EarliestDeadlineFirstScheduler(),
    "round-robin": () => new RoundRobinScheduler(),
};

const schedulerIds = Object.keys(schedulers) as SchedulerId[];
const periods = [4, 6, 8, 12];

export function schedulerName(schedulerId: SchedulerId) {
    return schedulers[schedulerId]().name;
}

export function createRandomPuzzleState(): PuzzleState {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const scheduler = randomItem(schedulerIds);
        const tasks = createRandomTasks();
        const schedule = schedulers[scheduler]().schedule(tasks);

        if (isValidSchedule(tasks, schedule)) {
            return { scheduler, tasks };
        }
    }

    return {
        scheduler: "earliest-deadline-first",
        tasks: [
            { id: 1, name: "Task 1", worst_case_execution_time: 1, period: 4, deadline: 4 },
            { id: 2, name: "Task 2", worst_case_execution_time: 1, period: 6, deadline: 6 },
        ],
    };
}

export function encodePuzzleState(state: PuzzleState) {
    return btoa(JSON.stringify(state)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodePuzzleState(encoded: string | null): PuzzleState | undefined {
    if (!encoded) {
        return undefined;
    }

    try {
        const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
        const state = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as PuzzleState;

        if (!isPuzzleState(state)) {
            return undefined;
        }

        return state;
    } catch {
        return undefined;
    }
}

export function solutionForPuzzle(state: PuzzleState) {
    return schedulers[state.scheduler]().schedule(state.tasks);
}

export function schedulesEqual(left: Schedule, right: Schedule) {
    if (left.quanta !== right.quanta) {
        return false;
    }

    const leftEntries = normalizeEntries(left.entries);
    const rightEntries = normalizeEntries(right.entries);

    return (
        leftEntries.length === rightEntries.length &&
        leftEntries.every(
            (entry, index) =>
                entry.taskId === rightEntries[index].taskId &&
                entry.allocatedTime === rightEntries[index].allocatedTime,
        )
    );
}

export function isValidSchedule(tasks: ReadonlyArray<Readonly<Task>>, schedule: Schedule) {
    const timeline = expandSchedule(schedule);

    if (timeline.length !== schedule.quanta) {
        return false;
    }

    const jobs = tasks.flatMap((task) => {
        const instances: {
            taskId: number;
            release: number;
            deadline: number;
            remaining: number;
        }[] = [];

        for (let release = 0; release < schedule.quanta; release += task.period) {
            instances.push({
                taskId: task.id,
                release,
                deadline: release + task.deadline,
                remaining: task.worst_case_execution_time,
            });
        }

        return instances;
    });

    for (let time = 0; time < timeline.length; time += 1) {
        const taskId = timeline[time];

        if (taskId === undefined) {
            continue;
        }

        const job = jobs
            .filter((candidate) => candidate.taskId === taskId && candidate.release <= time && time < candidate.deadline)
            .find((candidate) => candidate.remaining > 0);

        if (!job) {
            return false;
        }

        job.remaining -= 1;
    }

    return jobs.every((job) => job.remaining === 0);
}

function createRandomTasks() {
    const taskCount = randomInt(2, 4);
    const availablePeriods = shuffle(periods).slice(0, taskCount).toSorted((left, right) => left - right);
    const tasks: Task[] = [];

    for (let index = 0; index < taskCount; index += 1) {
        const period = availablePeriods[index];
        const currentUtilization = tasks.reduce(
            (sum, task) => sum + task.worst_case_execution_time / task.period,
            0,
        );
        const remainingBudget = Math.max(1, Math.floor((0.9 - currentUtilization) * period));
        const worstCaseExecutionTime = randomInt(1, Math.min(3, remainingBudget, period - 1));

        tasks.push({
            id: index + 1,
            name: `Task ${index + 1}`,
            worst_case_execution_time: worstCaseExecutionTime,
            period,
            deadline: period,
        });
    }

    return tasks;
}

function isPuzzleState(value: PuzzleState): value is PuzzleState {
    return (
        typeof value === "object" &&
        value !== null &&
        schedulerIds.includes(value.scheduler) &&
        Array.isArray(value.tasks) &&
        value.tasks.length >= 2 &&
        value.tasks.length <= 4 &&
        value.tasks.every(isTask)
    );
}

function isTask(value: Task): value is Task {
    return (
        typeof value.id === "number" &&
        typeof value.name === "string" &&
        Number.isInteger(value.worst_case_execution_time) &&
        value.worst_case_execution_time > 0 &&
        Number.isInteger(value.period) &&
        value.period > 0 &&
        Number.isInteger(value.deadline) &&
        value.deadline > 0
    );
}

function normalizeEntries(entries: ScheduleEntry[]) {
    const normalized: ScheduleEntry[] = [];

    for (const entry of entries) {
        if (entry.allocatedTime <= 0) {
            continue;
        }

        const previous = normalized.at(-1);

        if (previous && previous.taskId === entry.taskId) {
            previous.allocatedTime += entry.allocatedTime;
        } else {
            normalized.push({ ...entry });
        }
    }

    return normalized;
}

function expandSchedule(schedule: Schedule) {
    return schedule.entries.flatMap((entry) =>
        Array.from({ length: entry.allocatedTime }, () => entry.taskId),
    );
}

function randomItem<T>(values: T[]) {
    return values[Math.floor(Math.random() * values.length)];
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(values: T[]) {
    return [...values].sort(() => Math.random() - 0.5);
}
