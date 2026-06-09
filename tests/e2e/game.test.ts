import { expect, test } from "@playwright/test";
import { puzzleUrl } from "./puzzle-fixture";
import { ScheduleEditor } from "./pom/ScheduleEditor";

test.describe("Game", () => {
    test("entering the correct solution wins", async ({ page }) => {
        await page.goto(puzzleUrl);

        const editor = new ScheduleEditor(page);
        await editor.addEntry(1, 0, 1);
        await editor.addEntry(2, 1, 2);
        await editor.addEntry(3, 3, 1);
        await editor.addEntry(1, 4, 1);
        await editor.addEntry(2, 6, 2);
        await editor.addEntry(1, 8, 1);
        await editor.addEntry(3, 9, 1);
        await editor.addEntry(1, 12, 1);
        await editor.addEntry(2, 13, 2);
        await editor.addEntry(1, 16, 1);
        await editor.addEntry(3, 17, 1);
        await editor.addEntry(2, 18, 2);
        await editor.addEntry(1, 20, 1);

        await page.getByTestId("submit-schedule").click();

        await expect(page.getByTestId("round-result")).toContainText("Correct schedule.");
    });

    test("entering a correct solution prefix stays on track", async ({ page }) => {
        await page.goto(puzzleUrl);

        const editor = new ScheduleEditor(page);
        await editor.addEntry(1, 0, 1);
        await editor.addEntry(2, 1, 2);

        await page.getByTestId("submit-schedule").click();

        await expect(page.getByTestId("round-result")).toContainText("You're on the right track.");
        await expect(page.getByTestId("show-solution")).toBeHidden();
    });

    test("entering an incorrect solution prefix loses", async ({ page }) => {
        await page.goto(puzzleUrl);

        const editor = new ScheduleEditor(page);
        await editor.addEntry(2, 0, 1);

        await page.getByTestId("submit-schedule").click();

        await expect(page.getByTestId("round-result")).toContainText(
            "That schedule does not match the selected algorithm.",
        );
    });

    test("entering an incorrect solution loses", async ({ page }) => {
        await page.goto(puzzleUrl);

        await page.getByTestId("submit-schedule").click();

        await expect(page.getByTestId("round-result")).toContainText(
            "That schedule does not match the selected algorithm.",
        );
    });
});
