import { expect, type Locator, type Page } from "@playwright/test";

type ExpectedEntry = {
    taskId: number;
    start?: number;
    time: number;
};

type RenderedEntry = ExpectedEntry & {
    start: number;
    end: number;
};

/**
 * POM for the schedule editor component
 */
export class ScheduleEditor {
    constructor(private page: Page) {}

    /**
     * Adds a new entry to the schedule with the given parameters.
     * The entry is created by dragging in that task's channel from the start quantum to the end quantum.
     * @param taskId
     * @param start
     * @param time
     */
    async addEntry(taskId: number, start: number, time: number) {
        await this.dragNewEntryWithoutRelease(taskId, start, time);
        await this.releaseMouse();
    }

    async dragNewEntryWithoutRelease(taskId: number, start: number, time: number) {
        const track = this.getTrack(taskId);
        const y = await this.trackCenterY(track);
        const startX = await this.quantumX(track, start);
        const endX = await this.quantumX(track, start + time);

        await this.page.mouse.move(startX, y);
        await this.page.mouse.down();
        await this.page.mouse.move(endX, y);
    }

    async clickQuantum(taskId: number, quantum: number) {
        await this.mouseDownAtQuantum(taskId, quantum);
        await this.releaseMouse();
    }

    async mouseDownAtQuantum(taskId: number, quantum: number) {
        const track = this.getTrack(taskId);
        const x = await this.quantumX(track, quantum);
        const y = await this.trackCenterY(track);

        await this.page.mouse.move(x, y);
        await this.page.mouse.down();
    }

    async releaseMouse() {
        await this.page.mouse.up();
    }

    async moveHeldPointerToQuantum(taskId: number, quantum: number) {
        const track = this.getTrack(taskId);
        const x = await this.quantumX(track, quantum);
        const y = await this.trackCenterY(track);

        await this.page.mouse.move(x, y);
    }

    /**
     * Returns a locator for the entry of the given task that starts at the given time.
     * @param taskId
     * @param time
     */
    getEntry(taskId: number, time: number): Locator {
        return this.page.locator(
            `[data-testid="schedule-entry"][data-task-id="${taskId}"][data-start="${time}"]`,
        );
    }

    async dragEntryEndHandle(entry: Locator, offset: number) {
        await this.dragEntryHandle(entry, ".resize-handle.end", await this.offsetPastBlockers(entry, offset, "end"));
    }

    async dragEntryStartHandle(entry: Locator, offset: number) {
        await this.dragEntryHandle(
            entry,
            ".resize-handle.start",
            await this.offsetPastBlockers(entry, offset, "start"),
        );
    }

    /**
     * Expects the schedule to visually contain the given entries.
     * The entries must be given exactly (no merging / splitting of entries is allowed)
     * @param entries
     */
    async expectEntries(entries: ExpectedEntry[]) {
        const renderedEntries = await this.renderedEntries();
        const shouldAssertStart = entries.some((entry) => entry.start !== undefined);
        const expected = entries.map((entry) => ({
            taskId: entry.taskId,
            ...(entry.start === undefined ? {} : { start: entry.start }),
            time: entry.time,
        }));
        const actual = renderedEntries.map((entry) => ({
            taskId: entry.taskId,
            ...(shouldAssertStart ? { start: entry.start } : {}),
            time: entry.time,
        }));

        expect(actual).toEqual(expected);
    }

    private getTrack(taskId: number) {
        return this.page.locator(`[data-testid="schedule-track"][data-task-id="${taskId}"]`);
    }

    private async dragEntryHandle(entry: Locator, handleSelector: string, offset: number) {
        const handle = entry.locator(handleSelector);
        const handleBox = await handle.boundingBox();

        if (!handleBox) {
            throw new Error("Could not locate schedule entry resize handle");
        }

        const track = this.trackForEntry(entry);
        const quantumWidth = await this.quantumWidth(track);
        const startX = handleBox.x + handleBox.width / 2;
        const y = handleBox.y + handleBox.height / 2;

        await this.page.mouse.move(startX, y);
        await this.page.mouse.down();
        await this.page.mouse.move(startX + offset * quantumWidth, y);
        await this.page.mouse.up();
    }

    private async offsetPastBlockers(entry: Locator, offset: number, edge: "start" | "end") {
        const draggedEntry = await this.entryFromLocator(entry);
        const entries = await this.renderedEntries();
        let adjustedOffset = offset;
        let changed = true;

        while (changed) {
            changed = false;
            const edgeStart = edge === "end" ? draggedEntry.end : draggedEntry.start;
            const edgeEnd = edgeStart + adjustedOffset;
            const rangeStart = Math.min(edgeStart, edgeEnd);
            const rangeEnd = Math.max(edgeStart, edgeEnd);

            for (const candidate of entries) {
                if (candidate.taskId === draggedEntry.taskId) {
                    continue;
                }

                const candidateIsInDragPath = candidate.start < rangeEnd && candidate.end > rangeStart;
                const candidateIsAlreadyPassed =
                    adjustedOffset > 0 ? candidate.end < edgeEnd : candidate.start > edgeEnd;

                if (!candidateIsInDragPath || candidateIsAlreadyPassed) {
                    continue;
                }

                adjustedOffset += adjustedOffset >= 0 ? candidate.time : -candidate.time;
                changed = true;
            }
        }

        return adjustedOffset;
    }

    private trackForEntry(entry: Locator) {
        return entry.locator("xpath=ancestor::*[@data-testid='schedule-track'][1]");
    }

    private async quantumX(track: Locator, quantum: number) {
        const box = await track.boundingBox();

        if (!box) {
            throw new Error("Could not locate schedule track");
        }

        const quanta = await this.timelineQuanta();
        const clampedQuantum = Math.min(quanta, Math.max(0, quantum));

        return box.x + (box.width / quanta) * clampedQuantum;
    }

    private async quantumWidth(track: Locator) {
        const box = await track.boundingBox();

        if (!box) {
            throw new Error("Could not locate schedule track");
        }

        return box.width / (await this.timelineQuanta());
    }

    private async trackCenterY(track: Locator) {
        const box = await track.boundingBox();

        if (!box) {
            throw new Error("Could not locate schedule track");
        }

        return box.y + box.height / 2;
    }

    private async timelineQuanta() {
        return this.page.locator(".timeline").evaluate((timeline) => {
            const value = getComputedStyle(timeline).getPropertyValue("--quanta");
            const quanta = Number.parseInt(value, 10);

            if (!Number.isFinite(quanta) || quanta <= 0) {
                throw new Error(`Invalid timeline quanta value: ${value}`);
            }

            return quanta;
        });
    }

    private async renderedEntries(): Promise<RenderedEntry[]> {
        return this.page.locator('[data-testid="schedule-entry"]').evaluateAll((entries) =>
            entries.map((entry) => ({
                taskId: Number(entry.getAttribute("data-task-id")),
                start: Number(entry.getAttribute("data-start")),
                end: Number(entry.getAttribute("data-end")),
                time: Number(entry.getAttribute("data-time")),
            })),
        );
    }

    private async entryFromLocator(entry: Locator): Promise<RenderedEntry> {
        return entry.evaluate((element) => ({
            taskId: Number(element.getAttribute("data-task-id")),
            start: Number(element.getAttribute("data-start")),
            end: Number(element.getAttribute("data-end")),
            time: Number(element.getAttribute("data-time")),
        }));
    }
}
