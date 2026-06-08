<script lang="ts">
    import { EditableSchedule, type EditableScheduleEntry } from "./EditableSchedule.svelte";
    import type { Task } from "./scheduler/interface";

    type Marker = {
        id: string;
        kind: "release" | "deadline";
        quantum: number;
        label: string;
    };

    type TaskTrack = {
        task: Task;
        markers: Marker[];
    };

    const { tasks }: { tasks: Task[] } = $props();
    const schedule = new EditableSchedule();

    type Interaction =
        | {
              kind: "create";
              entry: EditableScheduleEntry;
              startQuantum: number;
              track: HTMLElement;
              mergedStart?: number;
              mergedEnd?: number;
          }
        | {
              kind: "move";
              entry: EditableScheduleEntry;
              pointerStartQuantum: number;
              entryStart: number;
              track: HTMLElement;
          }
        | {
              kind: "resize-start" | "resize-end";
              entry: EditableScheduleEntry;
              pointerStartQuantum: number;
              entryStart: number;
              entryEnd: number;
              track: HTMLElement;
          };

    let activeInteraction = $state<Interaction | undefined>();

    const gcd = (a: number, b: number): number => {
        let x = Math.abs(a);
        let y = Math.abs(b);

        while (y !== 0) {
            const next = x % y;
            x = y;
            y = next;
        }

        return x || 1;
    };

    const lcm = (a: number, b: number): number => Math.abs((a / gcd(a, b)) * b);

    const timelineQuanta = $derived.by(() => {
        const periods = tasks.map((task) => task.period).filter((period) => period > 0);

        if (periods.length === 0) {
            return 1;
        }

        return periods.reduce((hyperperiod, period) => lcm(hyperperiod, period), periods[0]);
    });

    const quantumIndexes = $derived(Array.from({ length: timelineQuanta + 1 }, (_, index) => index));
    const quantumCells = $derived(Array.from({ length: timelineQuanta }, (_, index) => index));

    const tracks = $derived<TaskTrack[]>(
        tasks.map((task) => {
            const markers: Marker[] = [];

            if (task.period > 0) {
                for (let release = 0; release <= timelineQuanta; release += task.period) {
                    markers.push({
                        id: `${task.id}-release-${release}`,
                        kind: "release",
                        quantum: release,
                        label: `${task.name} release at ${release}`,
                    });

                    const deadline = release + task.deadline;

                    if (deadline <= timelineQuanta) {
                        markers.push({
                            id: `${task.id}-deadline-${deadline}`,
                            kind: "deadline",
                            quantum: deadline,
                            label: `${task.name} deadline at ${deadline}`,
                        });
                    }
                }
            }

            return { task, markers };
        }),
    );

    $effect(() => {
        schedule.setQuanta(timelineQuanta);
    });

    const quantumFromPointer = (event: PointerEvent, element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const progress = (event.clientX - rect.left) / rect.width;

        return Math.min(timelineQuanta, Math.max(0, Math.round(progress * timelineQuanta)));
    };

    const interactionDirection = (currentQuantum: number, pointerStartQuantum: number) =>
        currentQuantum < pointerStartQuantum ? -1 : 1;

    const handleTrackPointerDown = (event: PointerEvent, task: Task) => {
        if (!(event.currentTarget instanceof HTMLElement)) {
            return;
        }

        const startQuantum = quantumFromPointer(event, event.currentTarget);
        const entry = schedule.createEntry(task.id, Math.min(startQuantum, timelineQuanta - 1), 1);

        activeInteraction = {
            kind: "create",
            entry,
            startQuantum,
            track: event.currentTarget,
            mergedStart: entry.start,
            mergedEnd: entry.end,
        };
    };

    const handleEntryPointerDown = (
        event: PointerEvent,
        entry: EditableScheduleEntry,
        kind: "move" | "resize-start" | "resize-end",
    ) => {
        event.stopPropagation();

        if (!(event.currentTarget instanceof HTMLElement)) {
            return;
        }

        const track = event.currentTarget.closest<HTMLElement>(".track");

        if (!track) {
            return;
        }

        const pointerStartQuantum = quantumFromPointer(event, track);

        activeInteraction = {
            kind,
            entry,
            pointerStartQuantum,
            entryStart: entry.start,
            entryEnd: entry.end,
            track,
        };
    };

    const handlePointerMove = (event: PointerEvent) => {
        if (!activeInteraction) {
            return;
        }

        const currentQuantum = quantumFromPointer(event, activeInteraction.track);

        if (activeInteraction.kind === "create") {
            const rawStart = Math.min(activeInteraction.startQuantum, currentQuantum);
            const rawEnd = Math.max(activeInteraction.startQuantum, currentQuantum);
            const start = Math.min(rawStart, activeInteraction.mergedStart ?? rawStart);
            const end = Math.max(rawEnd, activeInteraction.mergedEnd ?? rawEnd);

            activeInteraction.entry.start = Math.min(start, timelineQuanta - 1);
            activeInteraction.entry.time = Math.max(1, end - start || 1);
            schedule.moveEntry(
                activeInteraction.entry,
                activeInteraction.entry.start,
                interactionDirection(currentQuantum, activeInteraction.startQuantum),
            );

            if (activeInteraction.entry.start < rawStart || activeInteraction.entry.end > rawEnd) {
                activeInteraction.mergedStart = activeInteraction.entry.start;
                activeInteraction.mergedEnd = activeInteraction.entry.end;
            }

            return;
        }

        const delta = currentQuantum - activeInteraction.pointerStartQuantum;
        const direction = interactionDirection(currentQuantum, activeInteraction.pointerStartQuantum);

        if (activeInteraction.kind === "move") {
            schedule.moveEntry(activeInteraction.entry, activeInteraction.entryStart + delta, direction);
        } else if (activeInteraction.kind === "resize-start") {
            schedule.setEntryRange(
                activeInteraction.entry,
                activeInteraction.entryStart + delta,
                activeInteraction.entryEnd,
            );
        } else {
            schedule.setEntryRange(
                activeInteraction.entry,
                activeInteraction.entryStart,
                activeInteraction.entryEnd + delta,
            );
        }
    };

    const handlePointerUp = () => {
        if (activeInteraction) {
            schedule.finalizeEdit();
        }

        activeInteraction = undefined;
    };
</script>

<svelte:window onpointermove={handlePointerMove} onpointerup={handlePointerUp} />

<section class="schedule-editor" aria-label="Schedule editor">
    <div class="schedule-summary">
        <div>
            <h2>Proposed Schedule</h2>
            <p>{timelineQuanta} quanta repeating window</p>
        </div>
    </div>

    <div
        class="timeline"
        style={`--quanta: ${timelineQuanta};`}
    >
        <div class="track-label time-label">Task</div>
        <div class="time-axis" aria-hidden="true">
            {#each quantumIndexes as quantum}
                <span class="time-tick" style={`left: ${(quantum / timelineQuanta) * 100}%`}>
                    {quantum}
                </span>
            {/each}
        </div>

        {#each tracks as track}
            <div class="track-label">
                <strong>{track.task.name}</strong>
                <span>
                    C={track.task.worst_case_execution_time}, T={track.task.period}, D={track.task.deadline}
                </span>
            </div>

            <div
                class="track"
                role="button"
                tabindex="0"
                data-testid="schedule-track"
                data-task-id={track.task.id}
                aria-label={`${track.task.name} timeline`}
                onpointerdown={(event) => handleTrackPointerDown(event, track.task)}
            >
                <div class="quantum-grid" aria-hidden="true">
                    {#each quantumCells as quantum}
                        <span class:even={quantum % 2 === 0}></span>
                    {/each}
                </div>

                {#each schedule.entriesForTask(track.task.id) as entry (entry.id)}
                    <button
                        class="schedule-entry"
                        data-testid="schedule-entry"
                        data-task-id={track.task.id}
                        data-start={entry.start}
                        data-end={entry.end}
                        data-time={entry.time}
                        style={`left: ${(entry.start / timelineQuanta) * 100}%; width: ${(entry.time / timelineQuanta) * 100}%;`}
                        type="button"
                        aria-label={`${track.task.name} scheduled from ${entry.start} to ${entry.end}`}
                        title={`${track.task.name}: ${entry.start}-${entry.end}`}
                        onpointerdown={(event) => handleEntryPointerDown(event, entry, "move")}
                    >
                        <span
                            class="resize-handle start"
                            role="presentation"
                            onpointerdown={(event) => handleEntryPointerDown(event, entry, "resize-start")}
                        ></span>
                        <span class="entry-label">{entry.start}-{entry.end}</span>
                        <span
                            class="resize-handle end"
                            role="presentation"
                            onpointerdown={(event) => handleEntryPointerDown(event, entry, "resize-end")}
                        ></span>
                    </button>
                {/each}

                {#each track.markers as marker}
                    <span
                        class="marker {marker.kind}"
                        style={`left: ${(marker.quantum / timelineQuanta) * 100}%`}
                        title={marker.label}
                        aria-label={marker.label}
                    ></span>
                {/each}
            </div>
        {/each}
    </div>

    <div class="legend" aria-label="Timeline marker legend">
        <span><i class="release-key"></i>Release</span>
        <span><i class="deadline-key"></i>Deadline</span>
        <span><i class="entry-key"></i>Scheduled</span>
    </div>
</section>

<style>
    .schedule-editor {
        width: min(100%, 1040px);
        margin: 0 auto 48px;
        text-align: left;
    }

    .schedule-summary {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
        margin: 0 24px 14px;
    }

    .schedule-summary h2 {
        margin: 0;
    }

    .schedule-summary p {
        color: var(--text);
        font-size: 14px;
    }

    .timeline {
        --label-width: 164px;
        --quantum-width: 42px;
        display: grid;
        grid-template-columns: var(--label-width) minmax(
                calc(var(--quanta) * var(--quantum-width)),
                1fr
            );
        overflow-x: auto;
        border-block: 1px solid var(--border);
        background: var(--bg);
    }

    .track-label {
        position: sticky;
        left: 0;
        z-index: 3;
        display: flex;
        min-height: 64px;
        flex-direction: column;
        justify-content: center;
        gap: 4px;
        box-sizing: border-box;
        padding: 10px 16px;
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        background: var(--bg);
    }

    .track-label strong {
        color: var(--text-h);
        font-size: 15px;
        font-weight: 600;
        line-height: 1.2;
    }

    .track-label span {
        color: var(--text);
        font: 12px/1.2 var(--mono);
        white-space: nowrap;
    }

    .time-label {
        min-height: 42px;
        color: var(--text-h);
        font-size: 13px;
        font-weight: 600;
    }

    .time-axis {
        position: relative;
        min-height: 42px;
        border-bottom: 1px solid var(--border);
        background:
            repeating-linear-gradient(
                to right,
                transparent 0,
                transparent calc(var(--quantum-width) - 1px),
                var(--border) calc(var(--quantum-width) - 1px),
                var(--border) var(--quantum-width)
            ),
            var(--social-bg);
    }

    .time-tick {
        position: absolute;
        bottom: 7px;
        transform: translateX(-50%);
        color: var(--text);
        font: 11px/1 var(--mono);
    }

    .time-tick:first-child {
        transform: none;
    }

    .time-tick:last-child {
        transform: translateX(-100%);
    }

    .track {
        position: relative;
        min-height: 64px;
        border-bottom: 1px solid var(--border);
        background: var(--bg);
        touch-action: none;
        user-select: none;
    }

    .quantum-grid {
        display: grid;
        height: 100%;
        min-height: 64px;
        grid-template-columns: repeat(var(--quanta), minmax(var(--quantum-width), 1fr));
    }

    .quantum-grid span {
        border-right: 1px solid var(--border);
    }

    .quantum-grid span.even {
        background: rgba(127, 127, 127, 0.035);
    }

    .marker {
        position: absolute;
        top: 0;
        bottom: 0;
        z-index: 1;
        width: 2px;
        pointer-events: auto;
    }

    .schedule-entry {
        position: absolute;
        top: 16px;
        bottom: 14px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 18px;
        overflow: hidden;
        box-sizing: border-box;
        padding: 0;
        border: 1px solid color-mix(in srgb, var(--accent), var(--text-h) 20%);
        border-radius: 6px;
        color: var(--text-h);
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent),
            var(--accent-bg);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        cursor: grab;
        font: 12px/1 var(--mono);
    }

    .schedule-entry:active {
        cursor: grabbing;
    }

    .entry-label {
        min-width: 0;
        flex: 1 1 auto;
        overflow: hidden;
        padding: 0 3px;
        text-align: center;
        text-overflow: ellipsis;
        white-space: nowrap;
        pointer-events: none;
    }

    .resize-handle {
        flex: 0 0 8px;
        align-self: stretch;
        border: 0;
        background: color-mix(in srgb, var(--accent), transparent 58%);
        cursor: ew-resize;
    }

    .resize-handle.start {
        border-right: 1px solid color-mix(in srgb, var(--accent), transparent 36%);
    }

    .resize-handle.end {
        border-left: 1px solid color-mix(in srgb, var(--accent), transparent 36%);
    }

    .marker::after {
        content: "";
        position: absolute;
        top: 8px;
        left: 50%;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        transform: translateX(-50%);
        background: currentColor;
    }

    .marker.release {
        color: #1f7a5a;
        background: currentColor;
    }

    .marker.deadline {
        color: #b3261e;
        background: currentColor;
        transform: translateX(2px);
    }

    .legend {
        display: flex;
        gap: 18px;
        margin: 12px 24px 0;
        color: var(--text);
        font-size: 13px;
    }

    .legend span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
    }

    .legend i {
        display: inline-block;
        width: 14px;
        height: 2px;
    }

    .release-key {
        background: #1f7a5a;
    }

    .deadline-key {
        background: #b3261e;
    }

    .entry-key {
        background: var(--accent);
    }

    @media (max-width: 720px) {
        .schedule-editor {
            margin-bottom: 32px;
        }

        .schedule-summary {
            margin-inline: 16px;
        }

        .timeline {
            --label-width: 136px;
            --quantum-width: 36px;
        }

        .track-label {
            padding-inline: 12px;
        }
    }
</style>
