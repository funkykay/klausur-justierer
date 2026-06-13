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

<nav class="overflow-hidden" aria-label="Wizard-Schritte">
  <ol class="-mx-1 flex snap-x items-stretch overflow-x-auto px-1 pb-1 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0">
    {#each $wizard.steps as step, index}
      <li class="relative flex min-w-[5.75rem] flex-1 snap-center justify-center md:min-w-0">
        {#if index > 0}
          <div class={`absolute left-0 right-1/2 top-[1.625rem] h-0.5 ${connectorClass($wizard.steps[index - 1])}`}></div>
        {/if}

        {#if index < $wizard.steps.length - 1}
          <div class={`absolute left-1/2 right-0 top-[1.625rem] h-0.5 ${connectorClass(step)}`}></div>
        {/if}

        <button
          class="relative z-10 flex w-full flex-col items-center gap-2 rounded-lg px-2 py-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/20"
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

          <span class="block max-w-20 text-xs font-medium leading-tight text-slate-900 md:max-w-none md:text-sm">
            {step.title}
          </span>
        </button>
      </li>
    {/each}
  </ol>
</nav>