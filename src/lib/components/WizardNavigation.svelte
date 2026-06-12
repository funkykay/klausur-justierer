<script lang="ts">
  import { wizard } from '../store/wizardStore';

  $: isFirst = $wizard.currentStepIndex === 0;
  $: isLast = $wizard.currentStepIndex === $wizard.steps.length - 1;
  $: canFinish = isLast && $wizard.validation.valid;
</script>

<footer class="panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
  <button class="button-secondary" type="button" disabled={isFirst} onclick={wizard.previous}>
    Zurück
  </button>

  <div class="flex flex-col gap-2 md:flex-row md:items-center">
    {#if isLast && !$wizard.validation.valid}
      <p class="text-sm text-red-700">Abschluss erst möglich, wenn keine Validierungsfehler vorhanden sind.</p>
    {/if}

    <div class="flex gap-2">
      <button class="button-secondary" type="button" disabled={isLast} onclick={wizard.next}>
        Weiter
      </button>

      <button class="button-primary" type="button" disabled={!canFinish} onclick={wizard.finish}>
        Abschließen
      </button>
    </div>
  </div>
</footer>