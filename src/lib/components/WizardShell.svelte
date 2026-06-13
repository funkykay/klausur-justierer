<script lang="ts">
  import { wizard } from '../store/wizardStore';
  import SessionActions from './SessionActions.svelte';
  import StepChain from './StepChain.svelte';
  import WizardNavigation from './WizardNavigation.svelte';

  $: state = $wizard;
  $: currentStep = state.steps[state.currentStepIndex];
</script>

<div class={`mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-5 ${state.submitted ? '' : 'pb-36 md:pb-28'}`}>
  <header class="flex items-end justify-between gap-4">
    <div>
      <h1 class="text-3xl font-semibold tracking-tight text-slate-950">{state.title}</h1>
    </div>

    <SessionActions />
  </header>

  <section class="panel p-5">
    <StepChain />
  </section>

  {#if state.submitted}
    <section class="panel flex flex-1 flex-col justify-center p-8">
      <div class="mx-auto max-w-xl text-center">
        <p class="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Abgeschlossen</p>
        <h2 class="mt-3 text-2xl font-semibold text-slate-950">Klasur-Justierung ist vollständig.</h2>
        <p class="mt-3 text-sm text-slate-600">
          Alle Schritte sind valide und die Abschlussbestätigung wurde gesetzt.
        </p>
      </div>
    </section>
  {:else}
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
  {/if}
</div>