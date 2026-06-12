<script lang="ts">
  import FieldError from '../components/FieldError.svelte';
  import { wizard } from '../store/wizardStore';
  import type { WizardData } from '../types';

  $: data = $wizard.data.justierung;
  $: step = $wizard.steps.find((item) => item.id === 'justierung');
  $: errors = $wizard.validation.errorsByStep.justierung;
  $: showErrors = Boolean(step?.touched);

  function textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement | HTMLTextAreaElement).value;
  }

  function numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  function checkedValue(event: Event): boolean {
    return (event.currentTarget as HTMLInputElement).checked;
  }

  function updateJustierung<K extends keyof WizardData['justierung']>(
    key: K,
    value: WizardData['justierung'][K]
  ): void {
    wizard.updateData((current) => ({
      ...current,
      justierung: {
        ...current.justierung,
        [key]: value
      }
    }));
  }
</script>

<div class="space-y-6">
  <fieldset>
    <legend class="field-label">Verfahren</legend>

    <div class="mt-2 grid gap-2 md:grid-cols-3">
      <label class="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
        <input
          class="h-4 w-4 accent-slate-950"
          type="radio"
          name="method"
          checked={data.method === 'none'}
          onchange={() => updateJustierung('method', 'none')}
          onblur={wizard.markCurrentTouched}
        />
        <span>Keine Justierung</span>
      </label>

      <label class="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
        <input
          class="h-4 w-4 accent-slate-950"
          type="radio"
          name="method"
          checked={data.method === 'bonus'}
          onchange={() => updateJustierung('method', 'bonus')}
          onblur={wizard.markCurrentTouched}
        />
        <span>Bonus</span>
      </label>

      <label class="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2">
        <input
          class="h-4 w-4 accent-slate-950"
          type="radio"
          name="method"
          checked={data.method === 'linear'}
          onchange={() => updateJustierung('method', 'linear')}
          onblur={wizard.markCurrentTouched}
        />
        <span>Linear</span>
      </label>
    </div>
  </fieldset>

  <div class="field-grid">
    <label>
      <span class="field-label">Bonuspunktzahl</span>
      <input
        class={`field-input ${showErrors && errors.bonusPoints ? 'field-input-error' : ''}`}
        type="number"
        min="0"
        step="0.5"
        value={data.bonusPoints ?? ''}
        disabled={data.method !== 'bonus'}
        oninput={(event) => updateJustierung('bonusPoints', numberValue(event))}
        onblur={wizard.markCurrentTouched}
      />
      <FieldError errors={showErrors ? errors.bonusPoints : undefined} />
    </label>

    <label>
      <span class="field-label">Prüfer</span>
      <input
        class={`field-input ${showErrors && errors.reviewer ? 'field-input-error' : ''}`}
        type="text"
        value={data.reviewer}
        oninput={(event) => updateJustierung('reviewer', textValue(event))}
        onblur={wizard.markCurrentTouched}
      />
      <FieldError errors={showErrors ? errors.reviewer : undefined} />
    </label>
  </div>

  <label class="flex items-center gap-2 text-sm font-medium text-slate-800">
    <input
      class="h-4 w-4 rounded border-slate-300 accent-slate-950"
      type="checkbox"
      checked={data.capAtMaxPoints}
      onchange={(event) => updateJustierung('capAtMaxPoints', checkedValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    Auf Maximalpunktzahl deckeln
  </label>

  <label class="block">
    <span class="field-label">Begründung</span>
    <textarea
      class={`field-input min-h-28 resize-y ${showErrors && errors.reason ? 'field-input-error' : ''}`}
      value={data.reason}
      oninput={(event) => updateJustierung('reason', textValue(event))}
      onblur={wizard.markCurrentTouched}
    ></textarea>
    <FieldError errors={showErrors ? errors.reason : undefined} />
  </label>
</div>