<script lang="ts">
  import FieldError from '../components/FieldError.svelte';
  import { wizard } from '../store/wizardStore';
  import type { ExamTask } from '../types';

  $: data = $wizard.data.aufgaben;
  $: step = $wizard.steps.find((item) => item.id === 'aufgaben');
  $: errors = $wizard.validation.errorsByStep.aufgaben;
  $: showErrors = Boolean(step?.touched);

  function textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  function numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  function updateTask<K extends keyof ExamTask>(index: number, key: K, value: ExamTask[K]): void {
    wizard.updateData((current) => ({
      ...current,
      aufgaben: {
        tasks: current.aufgaben.tasks.map((task, taskIndex) =>
          taskIndex === index
            ? {
                ...task,
                [key]: value
              }
            : task
        )
      }
    }));
  }

  function addTask(): void {
    wizard.updateData((current) => ({
      ...current,
      aufgaben: {
        tasks: [
          ...current.aufgaben.tasks,
          {
            name: `Aufgabe ${current.aufgaben.tasks.length + 1}`,
            maxPoints: 0
          }
        ]
      }
    }));
  }

  function removeTask(index: number): void {
    wizard.updateData((current) => ({
      ...current,
      aufgaben: {
        tasks: current.aufgaben.tasks.filter((_, taskIndex) => taskIndex !== index)
      }
    }));
  }

  $: totalPoints = data.tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);
</script>

<div class="space-y-6">
  <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Aufgaben der Klausur</h3>
      <p class="mt-1 text-sm text-slate-600">Lege pro Aufgabe einen Namen und die erreichbare Punktzahl fest.</p>
    </div>

    <button class="button-secondary" type="button" onclick={addTask}>Aufgabe hinzufügen</button>
  </div>

  <FieldError errors={showErrors ? errors.tasks : undefined} />

  <div class="space-y-3">
    {#each data.tasks as task, index}
      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_7rem] md:items-start">
          <label>
            <span class="field-label">Aufgabe</span>
            <input
              class={`field-input ${showErrors && errors[`tasks.${index}.name`] ? 'field-input-error' : ''}`}
              type="text"
              value={task.name}
              oninput={(event) => updateTask(index, 'name', textValue(event))}
              onblur={wizard.markCurrentTouched}
            />
            <FieldError errors={showErrors ? errors[`tasks.${index}.name`] : undefined} />
          </label>

          <label>
            <span class="field-label">Punkte</span>
            <input
              class={`field-input ${showErrors && errors[`tasks.${index}.maxPoints`] ? 'field-input-error' : ''}`}
              type="number"
              min="0"
              step="0.5"
              value={task.maxPoints ?? ''}
              oninput={(event) => updateTask(index, 'maxPoints', numberValue(event))}
              onblur={wizard.markCurrentTouched}
            />
            <FieldError errors={showErrors ? errors[`tasks.${index}.maxPoints`] : undefined} />
          </label>

          <div class="md:pt-6">
            <button
              class="button-secondary w-full"
              type="button"
              disabled={data.tasks.length === 1}
              onclick={() => removeTask(index)}
            >
              Entfernen
            </button>
          </div>
        </div>
      </section>
    {/each}
  </div>

  <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm font-semibold text-slate-900">Gesamt</span>
      <span class="text-sm font-semibold text-slate-900">{totalPoints}</span>
    </div>
  </div>
</div>