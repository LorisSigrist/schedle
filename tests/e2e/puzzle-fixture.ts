import type { Task } from "../../src/scheduler/interface";

const tasks: Task[] = [
    {
        id: 1,
        name: "Task 1",
        worst_case_execution_time: 1,
        period: 4,
        deadline: 4,
    },
    {
        id: 2,
        name: "Task 2",
        worst_case_execution_time: 2,
        period: 6,
        deadline: 6,
    },
    {
        id: 3,
        name: "Task 3",
        worst_case_execution_time: 1,
        period: 8,
        deadline: 8,
    },
];

const puzzle = {
    scheduler: "earliest-deadline-first",
    tasks,
};

export const puzzleUrl = `/?puzzle=${Buffer.from(JSON.stringify(puzzle), "utf-8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "")}`;
