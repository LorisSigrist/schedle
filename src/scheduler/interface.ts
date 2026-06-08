export type ScheduleEntry = {
    /**
     * The ID of the task that is scheduled to run in this entry. 
     * If the ID is undefined, it means that the CPU is idle during this entry.
     */
    taskId?: number;
    
    /**
     * The duration of time allocated to the task in number of quanta.
     */
    allocatedTime: number;
}


/**
 * Represents a schedule for task execution
 */
export type Schedule = {
    /**
     * The entires in the schedule.
     */
    entries: ScheduleEntry[];
    
    /**
     * After how many quanta the schedule repeats itself. 
     */
    quanta: number;
}

export type Task = {
    id: number;
    name: string;

    /**
     * The worst case execution time of the task in number of quanta.
     */
    worst_case_execution_time: number;

    /**
     * The period of the task in number of quanta. 
     * The task is released every period quanta, starting from time 0.
     */
    period: number;

    /**
     * The deadline of the task in number of quanta. 
     * The deadline is the time by which the task must be completed after it has been released.
     */
    deadline: number;
}

export interface Scheduler {
    /**
     * Display name of the scheduler. This is used for display purposes only.
     */
    name: string;
    
    /**
     * Schedules the given tasks and returns a schedule.
     * @param tasks The tasks to be scheduled.
     * @returns A schedule for the given tasks.
     */
    schedule(tasks: ReadonlyArray<Readonly<Task>>): Schedule;
}