<script lang="ts">
    import ScheduleEditor from "./ScheduleEditor.svelte";
    import {
        createRandomPuzzleState,
        decodePuzzleState,
        encodePuzzleState,
        scheduleMatchesEnteredPrefix,
        schedulerName,
        schedulesEqual,
        solutionForPuzzle,
        type PuzzleState,
    } from "./game";
    import type { Schedule } from "./scheduler/interface";

    type Result = "correct" | "on-track" | "incorrect" | undefined;

    const puzzleQueryParam = "puzzle";

    let puzzle = $state(loadPuzzleState());
    let result = $state<Result>();
    let showSolution = $state(false);
    const puzzleKey = $derived(encodePuzzleState(puzzle));
    const solution = $derived(solutionForPuzzle(puzzle));

    function loadPuzzleState(): PuzzleState {
        const url = new URL(window.location.href);
        const decodedPuzzle = decodePuzzleState(url.searchParams.get(puzzleQueryParam));

        if (decodedPuzzle) {
            return decodedPuzzle;
        }

        const generatedPuzzle = createRandomPuzzleState();
        updatePuzzleUrl(generatedPuzzle);

        return generatedPuzzle;
    }

    function handleSubmit(schedule: Schedule) {
        const solution = solutionForPuzzle(puzzle);

        if (schedulesEqual(schedule, solution)) {
            result = "correct";
        } else if (scheduleMatchesEnteredPrefix(schedule, solution)) {
            result = "on-track";
        } else {
            result = "incorrect";
        }

        showSolution = false;
    }

    function nextRound() {
        puzzle = createRandomPuzzleState();
        result = undefined;
        showSolution = false;
        updatePuzzleUrl(puzzle);
    }

    function updatePuzzleUrl(nextPuzzle: PuzzleState) {
        const url = new URL(window.location.href);
        url.searchParams.set(puzzleQueryParam, encodePuzzleState(nextPuzzle));
        window.history.replaceState({}, "", url);
    }
</script>

<main>
    <section class="game-header" aria-label="Round">
        <div>
            <h1>Schedle</h1>
            <p>
                Build the schedule produced by <strong>{schedulerName(puzzle.scheduler)}</strong>.
            </p>
        </div>
        <button type="button" onclick={nextRound}>New Round</button>
    </section>

    {#if result}
        <section
            class="round-result"
            class:correct={result === "correct"}
            class:on-track={result === "on-track"}
            data-testid="round-result"
        >
            <p>
                {#if result === "correct"}
                    Correct schedule.
                {:else if result === "on-track"}
                    You're on the right track.
                {:else}
                    That schedule does not match the selected algorithm.
                {/if}
            </p>
            {#if result === "incorrect"}
                <button type="button" data-testid="show-solution" onclick={() => (showSolution = true)}>
                    View Solution
                </button>
            {/if}
        </section>
    {/if}

    {#key puzzleKey}
        <ScheduleEditor tasks={puzzle.tasks} solution={showSolution ? solution : undefined} onSubmit={handleSubmit} />
    {/key}
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 28px;
    }

    .game-header {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        width: min(100% - 48px, 1040px);
        margin: 0 auto;
        text-align: left;
    }

    h1 {
        margin: 0 0 8px;
    }

    .game-header p {
        max-width: 620px;
    }

    .game-header strong {
        color: var(--text-h);
        font-weight: 600;
    }

    .game-header button {
        flex: 0 0 auto;
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 9px 14px;
        color: var(--text-h);
        background: var(--social-bg);
        font: 600 14px/1 var(--sans);
        cursor: pointer;
    }

    .game-header button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    .round-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        width: min(100% - 48px, 1040px);
        box-sizing: border-box;
        margin: 0 auto;
        padding: 10px 12px;
        border: 1px solid #b3261e;
        border-radius: 6px;
        color: var(--text-h);
        background: color-mix(in srgb, #b3261e, transparent 90%);
        text-align: left;
        font-size: 14px;
    }

    .round-result p {
        margin: 0;
    }

    .round-result.correct {
        border-color: #1f7a5a;
        background: color-mix(in srgb, #1f7a5a, transparent 90%);
    }

    .round-result.on-track {
        border-color: #8a6a00;
        background: color-mix(in srgb, #8a6a00, transparent 90%);
    }

    .round-result button {
        flex: 0 0 auto;
        border: 1px solid color-mix(in srgb, #b3261e, var(--text-h) 16%);
        border-radius: 6px;
        padding: 7px 11px;
        color: var(--text-h);
        background: var(--bg);
        font: 600 13px/1 var(--sans);
        cursor: pointer;
    }

    .round-result button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
    }

    @media (max-width: 720px) {
        main {
            padding-top: 20px;
        }

        .game-header {
            width: calc(100% - 32px);
            align-items: start;
            flex-direction: column;
            gap: 14px;
        }

        .round-result {
            width: calc(100% - 32px);
            align-items: stretch;
            flex-direction: column;
        }

    }
</style>
