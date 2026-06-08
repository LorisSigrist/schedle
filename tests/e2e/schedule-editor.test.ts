import { test } from '@playwright/test'
import { ScheduleEditor } from './pom/ScheduleEditor';


test.describe("Schedule Editor", () => {
    let editor: ScheduleEditor;

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        editor = new ScheduleEditor(page);
    });

    test("it can add one entry to the schedule", async () => {
        await editor.addEntry(1, 0, 5);
        await editor.expectEntries([{ taskId: 1, time: 5 }]);
    });

    test("it merges adjacent entries of the same task", async () => {
        await editor.addEntry(1, 0, 5);
        await editor.addEntry(1, 5, 5);
        await editor.expectEntries([{ taskId: 1, time: 10 }]);
    });

    test("it merges a new entry placed before an adjacent entry of the same task", async () => {
        await editor.addEntry(1, 5, 5);
        await editor.addEntry(1, 0, 5);
        await editor.expectEntries([{ taskId: 1, time: 10 }]);
    });

    test("it merges discrete neighboring ranges when the new entry is placed before the existing one", async () => {
        await editor.addEntry(1, 5, 5);
        await editor.addEntry(1, 0, 4);
        await editor.expectEntries([{ taskId: 1, time: 10 }]);
    });

    test("it visually merges adjacent entries before releasing the drag", async () => {
        await editor.addEntry(1, 0, 5);

        await editor.dragNewEntryWithoutRelease(1, 5, 5);
        await editor.expectEntries([{ taskId: 1, time: 10 }]);

        await editor.releaseMouse();
        await editor.expectEntries([{
            taskId: 1,
            time: 10
        }]);
    });

    test("it visually merges adjacent entries before releasing a click", async () => {
        await editor.addEntry(1, 0, 5);

        await editor.mouseDownAtQuantum(1, 5);
        await editor.expectEntries([{ taskId: 1, time: 6 }]);

        await editor.releaseMouse();
        await editor.expectEntries([{ taskId: 1, time: 6 }]);
    });

    test("it keeps a leading live merge after releasing the drag", async () => {
        await editor.addEntry(1, 5, 5);

        await editor.dragNewEntryWithoutRelease(1, 0, 4);
        await editor.expectEntries([{ taskId: 1, time: 10 }]);

        await editor.moveHeldPointerToQuantum(1, 4);
        await editor.expectEntries([{ taskId: 1, time: 10 }]);

        await editor.releaseMouse();
        await editor.expectEntries([{ taskId: 1, time: 10 }]);
    });

    test("adding a new entry splits existing entries for other tasks", async  () => {
        await editor.addEntry(1, 0, 10);
        await editor.addEntry(2, 5, 5);
        await editor.expectEntries([
            { taskId: 1, time: 5 },
            { taskId: 2, time: 5 },
        ]);
    })

    test("clicking a one quantum entry splits an overlapping task without re-merging over it", async () => {
        await editor.addEntry(1, 0, 10);

        await editor.clickQuantum(2, 5);

        await editor.expectEntries([
            { taskId: 1, start: 0, time: 5 },
            { taskId: 1, start: 6, time: 4 },
            { taskId: 2, start: 5, time: 1 },
        ]);
    });

    test("trims other tasks entry when dragging an entry's end handle past it", async () => {
        await editor.addEntry(1, 0, 10);
        await editor.addEntry(2, 5, 5);
        const entry = editor.getEntry(1, 0);
        await editor.dragEntryEndHandle(entry, 5);
        await editor.expectEntries([
            { taskId: 1, time: 15 },
        ]);
    });

    test("deletes an entry when dragging the end handle onto the start handle", async () => {
        await editor.addEntry(1, 2, 5);
        const entry = editor.getEntry(1, 2);

        await editor.dragEntryEndHandle(entry, -5);

        await editor.expectEntries([]);
    });

    test("deletes an entry when dragging the start handle onto the end handle", async () => {
        await editor.addEntry(1, 2, 5);
        const entry = editor.getEntry(1, 2);

        await editor.dragEntryStartHandle(entry, 5);

        await editor.expectEntries([]);
    });

    test("flips an entry when dragging the end handle past the start handle", async () => {
        await editor.addEntry(1, 2, 5);
        const entry = editor.getEntry(1, 2);

        await editor.dragEntryEndHandle(entry, -7);

        await editor.expectEntries([{ taskId: 1, start: 0, time: 2 }]);
    });

    test("flips an entry when dragging the start handle past the end handle", async () => {
        await editor.addEntry(1, 2, 5);
        const entry = editor.getEntry(1, 2);

        await editor.dragEntryStartHandle(entry, 8);

        await editor.expectEntries([{ taskId: 1, start: 7, time: 3 }]);
    });

});
