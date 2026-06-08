<script lang="ts">
  import ScheduleEditor from "./ScheduleEditor.svelte";
  import type { Task } from "./scheduler/interface.ts"

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
  ]

</script>

<h1>Schedle</h1>
<ScheduleEditor {tasks} />