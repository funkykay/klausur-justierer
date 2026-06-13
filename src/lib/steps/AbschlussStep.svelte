<script lang="ts">
  import FieldError from '../components/FieldError.svelte';
  import { wizard } from '../store/wizardStore';

  $: data = $wizard.data;
  $: step = $wizard.steps.find((item) => item.id === 'abschluss');
  $: errors = $wizard.validation.errorsByStep.abschluss;
  $: showErrors = Boolean(step?.touched);
  $: totalTaskPoints = data.aufgaben.tasks.reduce((sum, task) => sum + (task.maxPoints ?? 0), 0);

  $: openErrors = $wizard.steps.flatMap((wizardStep) =>
    Object.values(wizardStep.validation.errors).flatMap((messages) =>
      messages.map((message) => ({
        stepTitle: wizardStep.title,
        message
      }))
    )
  );

  function checkedValue(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked;
  }

  function updateConfirmed(value: boolean): void {
    wizard.updateData((current) => ({
      ...current,
      abschluss: {
        ...current.abschluss,
        confirmed: value
      }
    }));
  }

  function formatValue(value: string | number | boolean | null): string {
    if (value === null || value === '') {
      return '—';
    }

    return String(value);
  }
</script>

<div class="space-y-6">
  <div class="grid gap-4 lg:grid-cols-2">
    <section class="rounded-lg border border-slate-200 p-4">
      <h3 class="text-sm font-semibold text-slate-950">Basisdaten</h3>
      <dl class="mt-3 grid grid-cols-[10rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt class="text-slate-500">Thema</dt>
        <dd class="font-medium text-slate-900">{formatValue(data.basis.topic)}</dd>

        <dt class="text-slate-500">Kurs</dt>
        <dd class="font-medium text-slate-900">{formatValue(data.basis.course)}</dd>
      </dl>
    </section>

    <section class="rounded-lg border border-slate-200 p-4">
      <h3 class="text-sm font-semibold text-slate-950">Justierung</h3>
      <dl class="mt-3 grid grid-cols-[10rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt class="text-slate-500">Verfahren</dt>
        <dd class="font-medium text-slate-900">{data.justierung.method}</dd>

        <dt class="text-slate-500">Bonus</dt>
        <dd class="font-medium text-slate-900">{formatValue(data.justierung.bonusPoints)}</dd>

        <dt class="text-slate-500">Prüfer</dt>
        <dd class="font-medium text-slate-900">{formatValue(data.justierung.reviewer)}</dd>
      </dl>
    </section>
  </div>

  <section class="rounded-lg border border-slate-200 p-4">
    <h3 class="text-sm font-semibold text-slate-950">Aufgaben</h3>

    <div class="mt-3 overflow-hidden rounded-md border border-slate-200">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-2 font-semibold">Aufgabe</th>
            <th class="px-4 py-2 font-semibold">Punkte</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {#each data.aufgaben.tasks as task}
            <tr>
              <td class="px-4 py-2 font-medium text-slate-900">{formatValue(task.name)}</td>
              <td class="px-4 py-2 text-slate-700">{formatValue(task.maxPoints)}</td>
            </tr>
          {/each}
        </tbody>
        <tfoot class="border-t border-slate-200 bg-slate-50">
          <tr>
            <td class="px-4 py-2 font-semibold text-slate-900">Gesamt</td>
            <td class="px-4 py-2 font-semibold text-slate-900">{totalTaskPoints}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>

  <section class="rounded-lg border border-slate-200 p-4">
    <h3 class="text-sm font-semibold text-slate-950">Notenschwellen</h3>

    <div class="mt-3 overflow-hidden rounded-md border border-slate-200">
      <table class="w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-2 font-semibold">Note</th>
            <th class="px-4 py-2 font-semibold">Mindestpunkte</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          {#each data.notenschema.gradeThresholds as threshold}
            <tr>
              <td class="px-4 py-2 font-medium text-slate-900">{threshold.grade}</td>
              <td class="px-4 py-2 text-slate-700">{formatValue(threshold.minPoints)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  {#if openErrors.length}
    <section class="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 class="text-sm font-semibold text-red-800">Offene Validierungen</h3>
      <ul class="mt-3 space-y-1 text-sm text-red-700">
        {#each openErrors as error}
          <li>
            <span class="font-semibold">{error.stepTitle}:</span>
            {error.message}
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <section class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
      Keine Validierungsfehler vorhanden.
    </section>
  {/if}

  <label class="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
    <input
      class="mt-0.5 h-4 w-4 rounded border-slate-300 accent-slate-950"
      type="checkbox"
      checked={data.abschluss.confirmed}
      onchange={(event) => updateConfirmed(checkedValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <span>
      <span class="block text-sm font-medium text-slate-900">Abschluss bestätigen</span>
      <FieldError errors={showErrors ? errors.confirmed : undefined} />
    </span>
  </label>
</div>