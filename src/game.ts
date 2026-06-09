import type { Schedule, ScheduleEntry, Scheduler, Task } from "./scheduler/interface";
import { EarliestDeadlineFirstScheduler } from "./scheduler/earliest_deadline_first";
import { RateMonotonicScheduler } from "./scheduler/rate_monotonic";

export type SchedulerId = "rate-monotonic" | "earliest-deadline-first";

export type PuzzleState = {
    scheduler: SchedulerId;
    tasks: Task[];
};

export const schedulers: Record<SchedulerId, () => Scheduler> = {
    "rate-monotonic": () => new RateMonotonicScheduler(),
    "earliest-deadline-first": () => new EarliestDeadlineFirstScheduler(),
};

const schedulerIds = Object.keys(schedulers) as SchedulerId[];
const periods = [4, 5, 6, 8, 10, 12];
const minPuzzleUtilization = 0.72;
const maxPuzzleUtilization = 0.95;

export function schedulerName(schedulerId: SchedulerId) {
    return schedulers[schedulerId]().name;
}

export function createRandomPuzzleState(): PuzzleState {
    for (let attempt = 0; attempt < 200; attempt += 1) {
        const scheduler = randomItem(schedulerIds);
        const tasks = createRandomTasks();
        const schedule = schedulers[scheduler]().schedule(tasks);

        if (utilization(tasks) >= minPuzzleUtilization && isValidSchedule(tasks, schedule)) {
            return { scheduler, tasks };
        }
    }

    return {
        scheduler: "earliest-deadline-first",
        tasks: [
            { id: 1, name: "Task 1", worst_case_execution_time: 2, period: 6, deadline: 6 },
            { id: 2, name: "Task 2", worst_case_execution_time: 2, period: 8, deadline: 8 },
            { id: 3, name: "Task 3", worst_case_execution_time: 3, period: 12, deadline: 12 },
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

export function scheduleMatchesEnteredPrefix(left: Schedule, right: Schedule) {
    const leftTimeline = expandSchedule(left);
    const rightTimeline = expandSchedule(right);
    let prefixLength = leftTimeline.length;

    while (prefixLength > 0 && leftTimeline[prefixLength - 1] === undefined) {
        prefixLength -= 1;
    }

    return (
        prefixLength > 0 &&
        prefixLength <= rightTimeline.length &&
        leftTimeline
            .slice(0, prefixLength)
            .every((taskId, index) => taskId === rightTimeline[index])
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
    const taskCount = randomInt(3, 5);
    const availablePeriods = shuffle(periods).slice(0, taskCount);
    const targetUtilization = randomFloat(minPuzzleUtilization, maxPuzzleUtilization);
    const weights = Array.from({ length: taskCount }, () => randomFloat(0.7, 1.6));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const tasks = availablePeriods.map((period, index) => {
        const weightedUtilization = targetUtilization * (weights[index] / totalWeight);
        const baseTime = Math.round(weightedUtilization * period);
        const worstCaseExecutionTime = Math.min(period - 1, Math.max(1, baseTime));

        return {
            id: index + 1,
            name: `Task ${index + 1}`,
            worst_case_execution_time: worstCaseExecutionTime,
            period,
            deadline: period,
        };
    });

    return shuffle(tasks).map((task, index) => ({
        ...task,
        id: index + 1,
        name: `Task ${index + 1}`,
    }));
}

function isPuzzleState(value: PuzzleState): value is PuzzleState {
    return (
        typeof value === "object" &&
        value !== null &&
        schedulerIds.includes(value.scheduler) &&
        Array.isArray(value.tasks) &&
        value.tasks.length >= 3 &&
        value.tasks.length <= 5 &&
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

function randomFloat(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function shuffle<T>(values: T[]) {
    return [...values].sort(() => Math.random() - 0.5);
}

function utilization(tasks: ReadonlyArray<Readonly<Task>>) {
    return tasks.reduce((sum, task) => sum + task.worst_case_execution_time / task.period, 0);
}
