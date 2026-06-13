<script lang="ts">
  import FieldError from '../components/FieldError.svelte';
  import { wizard } from '../store/wizardStore';
  import type { GradeThreshold } from '../types';

  $: data = $wizard.data.notenschema;
  $: step = $wizard.steps.find((item) => item.id === 'notenschema');
  $: errors = $wizard.validation.errorsByStep.notenschema;
  $: showErrors = Boolean(step?.touched);

  function textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  function numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  function updateThreshold<K extends keyof GradeThreshold>(index: number, key: K, value: GradeThreshold[K]): void {
    wizard.updateData((current) => ({
      ...current,
      notenschema: {
        gradeThresholds: current.notenschema.gradeThresholds.map((threshold, thresholdIndex) =>
          thresholdIndex === index
            ? {
                ...threshold,
                [key]: value
              }
            : threshold
        )
      }
    }));
  }

  function addThreshold(): void {
    wizard.updateData((current) => ({
      ...current,
      notenschema: {
        gradeThresholds: [
          ...current.notenschema.gradeThresholds,
          {
            grade: `${current.notenschema.gradeThresholds.length + 1}`,
            minPercent: null
          }
        ]
      }
    }));
  }

  function removeThreshold(index: number): void {
    wizard.updateData((current) => ({
      ...current,
      notenschema: {
        gradeThresholds: current.notenschema.gradeThresholds.filter((_, thresholdIndex) => thresholdIndex !== index)
      }
    }));
  }
</script>

<div class="space-y-6">
  <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Notenschlüssel</h3>
      <p class="mt-1 text-sm text-slate-600">
        Lege die Noten und die Mindestprozente fest. Die Reihenfolge läuft von der höchsten zur niedrigsten Schwelle.
      </p>
    </div>

    <button class="button-secondary" type="button" onclick={addThreshold}>Note hinzufügen</button>
  </div>

  <FieldError errors={showErrors ? errors.gradeThresholds : undefined} />

  <div class="space-y-3">
    {#each data.gradeThresholds as threshold, index}
      <section class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem_7rem] md:items-start">
          <label>
            <span class="field-label">Note</span>
            <input
              class={`field-input ${showErrors && errors[`gradeThresholds.${index}.grade`] ? 'field-input-error' : ''}`}
              type="text"
              value={threshold.grade}
              placeholder="z. B. Sehr Gut"
              oninput={(event) => updateThreshold(index, 'grade', textValue(event))}
              onblur={wizard.markCurrentTouched}
            />
            <FieldError errors={showErrors ? errors[`gradeThresholds.${index}.grade`] : undefined} />
          </label>

          <label>
            <span class="field-label">Ab Prozent</span>
            <div class="relative">
              <input
                class={`field-input pr-8 ${
                  showErrors && errors[`gradeThresholds.${index}.minPercent`] ? 'field-input-error' : ''
                }`}
                type="number"
                min="0"
                max="100"
                step="0.5"
                inputmode="decimal"
                value={threshold.minPercent ?? ''}
                placeholder="z. B. 90"
                oninput={(event) => updateThreshold(index, 'minPercent', numberValue(event))}
                onblur={wizard.markCurrentTouched}
              />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
            </div>
            <FieldError errors={showErrors ? errors[`gradeThresholds.${index}.minPercent`] : undefined} />
          </label>

          <div class="md:pt-6">
            <button
              class="button-secondary w-full"
              type="button"
              disabled={data.gradeThresholds.length === 1}
              onclick={() => removeThreshold(index)}
            >
              Entfernen
            </button>
          </div>
        </div>
      </section>
    {/each}
  </div>
</div>