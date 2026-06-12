<script lang="ts">
  import { wizard } from '../store/wizardStore';
  import type { WizardStep } from '../types';

  function pearlClass(step: WizardStep, index: number, currentIndex: number): string {
    const current = index === currentIndex;
    const invalidTouched = step.touched && !step.validation.valid;
    const validTouched = step.touched && step.validation.valid;

    if (current && invalidTouched) {
      return 'border-red-600 bg-red-600 text-white ring-4 ring-red-100';
    }

    if (current) {
      return 'border-slate-950 bg-slate-950 text-white ring-4 ring-slate-200';
    }

    if (invalidTouched) {
      return 'border-red-600 bg-red-50 text-red-700';
    }

    if (validTouched) {
      return 'border-emerald-600 bg-emerald-50 text-emerald-700';
    }

    return 'border-slate-300 bg-white text-slate-500';
  }

  function connectorClass(step: WizardStep): string {
    if (!step.touched) {
      return 'bg-slate-200';
    }

    return step.validation.valid ? 'bg-emerald-500' : 'bg-red-400';
  }
</script>

<nav aria-label="Wizard-Schritte">
  <ol class="grid grid-cols-1 gap-3 md:grid-cols-4 md:gap-0">
    {#each $wizard.steps as step, index}
      <li class="relative flex items-center md:flex-col md:items-stretch">
        {#if index > 0}
          <div class={`hidden h-0.5 md:absolute md:left-0 md:right-1/2 md:top-5 md:block ${connectorClass($wizard.steps[index - 1])}`}></div>
        {/if}

        {#if index < $wizard.steps.length - 1}
          <div class={`hidden h-0.5 md:absolute md:left-1/2 md:right-0 md:top-5 md:block ${connectorClass(step)}`}></div>
        {/if}

        <button
          class="relative z-10 flex items-center gap-3 text-left md:flex-col md:text-center"
          type="button"
          aria-current={index === $wizard.currentStepIndex ? 'step' : undefined}
          onclick={() => wizard.goTo(index)}
        >
          <span
            class={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${pearlClass(
              step,
              index,
              $wizard.currentStepIndex
            )}`}
          >
            {index + 1}
          </span>

          <span class="block min-w-0 text-sm font-medium text-slate-900">{step.title}</span>
        </button>
      </li>
    {/each}
  </ol>
</nav>