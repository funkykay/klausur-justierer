<script lang="ts">
  import { wizard } from '../store/wizardStore';
  import SessionActions from './SessionActions.svelte';
  import StepChain from './StepChain.svelte';
  import WizardNavigation from './WizardNavigation.svelte';

  $: state = $wizard;
  $: currentStep = state.steps[state.currentStepIndex];
</script>

<div class="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-5 pb-36 md:pb-28">
  <header class="flex items-end justify-between gap-4">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-slate-950">{state.title}</h1>
    </div>

    <SessionActions />
  </header>

  <section class="panel p-5">
    <StepChain />
  </section>

  <section class="panel flex-1 p-6">
    <div class="mb-6 border-b border-slate-200 pb-4">
      <p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        Schritt {state.currentStepIndex + 1} von {state.steps.length}
      </p>
      <h2 class="mt-1 text-xl font-semibold text-slate-950">{currentStep.title}</h2>
    </div>

    <svelte:component this={currentStep.view} />
  </section>

  <WizardNavigation />
</div>