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
    <span class="field-label">Thema</span>
    <input
      class={`field-input ${showErrors && errors.topic ? 'field-input-error' : ''}`}
      type="text"
      value={data.topic}
      oninput={(event) => updateBasis('topic', textValue(event))}
      onblur={wizard.markCurrentTouched}
    />
    <FieldError errors={showErrors ? errors.topic : undefined} />
  </label>
</div>