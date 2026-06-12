<script lang="ts">
  import FieldError from '../components/FieldError.svelte';
  import { wizard } from '../store/wizardStore';

  $: data = $wizard.data.notenschema;
  $: step = $wizard.steps.find((item) => item.id === 'notenschema');
  $: errors = $wizard.validation.errorsByStep.notenschema;
  $: showErrors = Boolean(step?.touched);

  function numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  function updatePassingPoints(value: number | null): void {
    wizard.updateData((current) => ({
      ...current,
      notenschema: {
        ...current.notenschema,
        passingPoints: value
      }
    }));
  }

  function updateThreshold(index: number, value: number | null): void {
    wizard.updateData((current) => ({
      ...current,
      notenschema: {
        ...current.notenschema,
        gradeThresholds: current.notenschema.gradeThresholds.map((threshold, thresholdIndex) =>
          thresholdIndex === index
            ? {
                ...threshold,
                minPoints: value
              }
            : threshold
        )
      }
    }));
  }
</script>

<div class="space-y-6">
  <label class="block max-w-sm">
    <span class="field-label">Bestehensgrenze</span>
    <input
      class={`field-input ${showErrors && errors.passingPoints ? 'field-input-error' : ''}`}
      type="number"
      min="0"
      step="0.5"
      value={data.passingPoints ?? ''}
      oninput={(event) => updatePassingPoints(numberValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.passingPoints : undefined} />
  </label>

  <div>
    <h3 class="text-sm font-semibold text-slate-900">Notenschwellen</h3>

    <div class="mt-3 overflow-hidden rounded-lg border border-slate-200">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th class="w-40 px-4 py-3 font-semibold">Note</th>
            <th class="px-4 py-3 font-semibold">Mindestpunkte</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200 bg-white">
          {#each data.gradeThresholds as threshold, index}
            <tr>
              <td class="px-4 py-3 font-medium text-slate-900">{threshold.grade}</td>
              <td class="px-4 py-3">
                <input
                  class={`field-input mt-0 max-w-xs ${
                    showErrors && errors[`gradeThresholds.${index}.minPoints`] ? 'field-input-error' : ''
                  }`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={threshold.minPoints ?? ''}
                  oninput={(event) => updateThreshold(index, numberValue(event))}
                  onblur={wizard.markCurrentTouched}
                />
                <FieldError errors={showErrors ? errors[`gradeThresholds.${index}.minPoints`] : undefined} />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>