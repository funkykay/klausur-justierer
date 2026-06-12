<script lang="ts">
  import FieldError from '../components/FieldError.svelte';
  import { wizard } from '../store/wizardStore';
  import type { WizardData } from '../types';

  $: data = $wizard.data.basis;
  $: step = $wizard.steps.find((item) => item.id === 'basis');
  $: errors = $wizard.validation.errorsByStep.basis;
  $: showErrors = Boolean(step?.touched);

  function textValue(event: Event): string {
    return (event.currentTarget as HTMLInputElement).value;
  }

  function numberValue(event: Event): number | null {
    const value = (event.currentTarget as HTMLInputElement).value;
    return value === '' ? null : Number(value);
  }

  function updateBasis<K extends keyof WizardData['basis']>(key: K, value: WizardData['basis'][K]): void {
    wizard.updateData((current) => ({
      ...current,
      basis: {
        ...current.basis,
        [key]: value
      }
    }));
  }
</script>

<div class="field-grid">
  <label>
    <span class="field-label">Klausurtitel</span>
    <input
      class={`field-input ${showErrors && errors.title ? 'field-input-error' : ''}`}
      type="text"
      value={data.title}
      oninput={(event) => updateBasis('title', textValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.title : undefined} />
  </label>

  <label>
    <span class="field-label">Kurs</span>
    <input
      class={`field-input ${showErrors && errors.course ? 'field-input-error' : ''}`}
      type="text"
      value={data.course}
      oninput={(event) => updateBasis('course', textValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.course : undefined} />
  </label>

  <label>
    <span class="field-label">Datum</span>
    <input
      class={`field-input ${showErrors && errors.examDate ? 'field-input-error' : ''}`}
      type="date"
      value={data.examDate}
      oninput={(event) => updateBasis('examDate', textValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.examDate : undefined} />
  </label>

  <label>
    <span class="field-label">Maximalpunktzahl</span>
    <input
      class={`field-input ${showErrors && errors.maxPoints ? 'field-input-error' : ''}`}
      type="number"
      min="0"
      step="0.5"
      value={data.maxPoints ?? ''}
      oninput={(event) => updateBasis('maxPoints', numberValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.maxPoints : undefined} />
  </label>

  <label>
    <span class="field-label">Teilnehmerzahl</span>
    <input
      class={`field-input ${showErrors && errors.participantCount ? 'field-input-error' : ''}`}
      type="number"
      min="1"
      step="1"
      value={data.participantCount ?? ''}
      oninput={(event) => updateBasis('participantCount', numberValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.participantCount : undefined} />
  </label>
</div>