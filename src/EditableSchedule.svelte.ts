import type { Schedule, ScheduleEntry } from "./scheduler/interface";

type EditDirection = -1 | 1;

let nextEntryId = 1;

export class EditableScheduleEntry {
    id = nextEntryId++;

    /**
     * The ID of the task that is scheduled to run in this entry.
     */
    taskId = $state<number | undefined>();

    /**
     * After how many quanta this entry starts.
     */
    start = $state(0);

    /**
     * How long this entry runs for, in quanta.
     */
    time = $state(1);

    constructor(taskId: number | undefined, start: number, time: number) {
        this.taskId = taskId;
        this.start = start;
        this.time = time;
    }

    get end() {
        return this.start + this.time;
    }
}

export class EditableSchedule implements Schedule {
    segments = $state<EditableScheduleEntry[]>([]);
    quanta = $state(1);

    constructor(quanta = 1) {
        this.quanta = Math.max(1, quanta);
    }

    get entries(): ScheduleEntry[] {
        const entries: ScheduleEntry[] = [];
        let nextQuantum = 0;

        for (const entry of this.segments
            .filter((segment) => segment.time > 0)
            .toSorted((left, right) => left.start - right.start)) {
            if (entry.start > nextQuantum) {
                appendScheduleEntry(entries, undefined, entry.start - nextQuantum);
            }

            appendScheduleEntry(entries, entry.taskId, entry.time);
            nextQuantum = entry.end;
        }

        if (nextQuantum < this.quanta) {
            appendScheduleEntry(entries, undefined, this.quanta - nextQuantum);
        }

        return entries;
    }

    setQuanta(quanta: number) {
        this.quanta = Math.max(1, quanta);

        for (const entry of this.segments) {
            entry.start = this.clampStart(entry.start, entry.time);
        }
    }

    entriesForTask(taskId: number) {
        return this.segments
            .filter((entry) => entry.taskId === taskId && entry.time > 0)
            .toSorted((left, right) => left.start - right.start);
    }

    createEntry(taskId: number, start: number, time = 1) {
        const entry = new EditableScheduleEntry(
            taskId,
            this.clampStart(start, time),
            this.clampTime(time),
        );

        this.segments.push(entry);
        this.mergeIntoAnchor(entry);
        this.resolveConflicts(entry);

        return entry;
    }

    moveEntry(entry: EditableScheduleEntry, start: number, direction: EditDirection) {
        entry.start = this.clampStart(start, entry.time);
        this.mergeIntoAnchor(entry);
        this.resolveConflicts(entry);
    }

    resizeEntryStart(entry: EditableScheduleEntry, start: number, direction: EditDirection) {
        this.setEntryRange(entry, start, entry.end);
    }

    resizeEntryEnd(entry: EditableScheduleEntry, end: number, direction: EditDirection) {
        this.setEntryRange(entry, entry.start, end);
    }

    setEntryRange(entry: EditableScheduleEntry, start: number, end: number) {
        const rangeStart = this.clampQuantum(Math.min(start, end));
        const rangeEnd = this.clampQuantum(Math.max(start, end));

        entry.start = rangeStart;
        entry.time = rangeEnd - rangeStart;

        if (entry.time > 0) {
            this.mergeIntoAnchor(entry);
            this.resolveConflicts(entry);
        }
    }

    finalizeEdit() {
        this.segments = this.segments.filter((entry) => entry.time > 0);
        this.mergeAdjacentEntries();
    }

    private clampQuantum(quantum: number) {
        return Math.min(Math.max(0, quantum), this.quanta);
    }

    private clampStart(start: number, time: number) {
        return Math.min(Math.max(0, start), Math.max(0, this.quanta - time));
    }

    private clampTime(time: number) {
        return Math.max(1, Math.min(this.quanta, time));
    }

    private overlaps(left: EditableScheduleEntry, right: EditableScheduleEntry) {
        return left.start < right.end && right.start < left.end;
    }

    private touchesOrOverlaps(left: EditableScheduleEntry, right: EditableScheduleEntry) {
        return left.start <= right.end + 1 && right.start <= left.end + 1;
    }

    private canMergeSameTask(left: EditableScheduleEntry, right: EditableScheduleEntry) {
        if (left.taskId !== right.taskId || !this.touchesOrOverlaps(left, right)) {
            return false;
        }

        const first = left.start <= right.start ? left : right;
        const second = first === left ? right : left;
        const gapStart = first.end;
        const gapEnd = second.start;

        if (gapEnd <= gapStart) {
            return true;
        }

        const gapIsDiscreteNeighbor = gapEnd - gapStart <= 1;
        const gapIsBlocked = this.segments.some(
            (entry) =>
                entry.id !== left.id &&
                entry.id !== right.id &&
                entry.taskId !== left.taskId &&
                entry.time > 0 &&
                entry.start < gapEnd &&
                gapStart < entry.end,
        );

        return gapIsDiscreteNeighbor && !gapIsBlocked;
    }

    private mergeIntoAnchor(anchor: EditableScheduleEntry) {
        let changed = true;

        while (changed) {
            changed = false;

            this.segments = this.segments.filter((candidate) => {
                if (
                    candidate.id === anchor.id ||
                    !this.canMergeSameTask(anchor, candidate)
                ) {
                    return true;
                }

                const start = Math.min(anchor.start, candidate.start);
                const end = Math.max(anchor.end, candidate.end);

                anchor.start = start;
                anchor.time = end - start;
                changed = true;

                return false;
            });
        }
    }

    private resolveConflicts(anchor: EditableScheduleEntry) {
        const replacements: EditableScheduleEntry[] = [];

        this.segments = this.segments.filter((candidate) => {
            if (
                candidate.id === anchor.id ||
                candidate.taskId === anchor.taskId ||
                !this.overlaps(anchor, candidate)
            ) {
                return true;
            }

            if (candidate.start < anchor.start) {
                replacements.push(
                    new EditableScheduleEntry(candidate.taskId, candidate.start, anchor.start - candidate.start),
                );
            }

            if (candidate.end > anchor.end) {
                replacements.push(
                    new EditableScheduleEntry(candidate.taskId, anchor.end, candidate.end - anchor.end),
                );
            }

            return false;
        });

        this.segments.push(...replacements);
    }

    private mergeAdjacentEntries() {
        const sorted = this.segments.toSorted((left, right) => {
            if (left.taskId !== right.taskId) {
                return Number(left.taskId ?? -1) - Number(right.taskId ?? -1);
            }

            return left.start - right.start;
        });
        const merged: EditableScheduleEntry[] = [];

        for (const entry of sorted) {
            const previous = merged.at(-1);

            if (previous && this.canMergeSameTask(previous, entry)) {
                previous.time = Math.max(previous.end, entry.end) - previous.start;
            } else {
                merged.push(entry);
            }
        }

        this.segments = merged.toSorted((left, right) => left.start - right.start);
    }
}

function appendScheduleEntry(entries: ScheduleEntry[], taskId: number | undefined, allocatedTime: number) {
    if (allocatedTime <= 0) {
        return;
    }

    const previousEntry = entries.at(-1);

    if (previousEntry && previousEntry.taskId === taskId) {
        previousEntry.allocatedTime += allocatedTime;
    } else {
        entries.push({ taskId, allocatedTime });
    }
}
