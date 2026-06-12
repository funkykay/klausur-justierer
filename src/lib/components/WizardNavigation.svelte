<script lang="ts">
  import { wizard } from '../store/wizardStore';

  $: isFirst = $wizard.currentStepIndex === 0;
  $: isLast = $wizard.currentStepIndex === $wizard.steps.length - 1;
  $: canFinish = isLast && $wizard.validation.valid;
</script>

<footer class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
  <div class="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
    <button class="button-secondary" type="button" disabled={isFirst} onclick={wizard.previous}>
      Zurück
    </button>

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