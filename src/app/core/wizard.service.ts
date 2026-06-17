import { computed, Injectable, signal } from '@angular/core';
import type { WizardData, WizardSessionSnapshot, WizardState } from './wizard.models';
import { normalizeWizardData } from './wizard-data-normalization';
import { createInitialWizardData } from './wizard-defaults';
import { buildWizardValidation, createInitialWizardValidation, createWizardSteps } from './wizard-steps';

function validateState(state: WizardState): WizardState {
  const data = normalizeWizardData(state.data);
  const currentStepId = state.steps[state.currentStepIndex]?.id;
  const touchesPrerequisites = currentStepId === 'justierung';
  const steps = state.steps.map((step) => ({
    ...step,
    touched: touchesPrerequisites && step.id !== 'justierung' ? true : step.touched,
    validation: step.validate(data)
  }));

  return {
    ...state,
    data,
    steps,
    validation: buildWizardValidation(steps)
  };
}

function markStepTouched(state: WizardState, index: number): WizardState {
  return {
    ...state,
    steps: state.steps.map((step, stepIndex) => ({
      ...step,
      touched: stepIndex === index ? true : step.touched
    }))
  };
}

function createInitialState(): WizardState {
  return validateState({
    title: 'Klausur-Justierer',
    data: createInitialWizardData(),
    steps: createWizardSteps(),
    currentStepIndex: 0,
    validation: createInitialWizardValidation()
  });
}

function applySessionSnapshot(snapshot: WizardSessionSnapshot): WizardState {
  const touchedStepIds = new Set(snapshot.touchedStepIds);
  const initial = validateState({
    ...createInitialState(),
    data: snapshot.data
  });
  const snapshotStepIndex = initial.steps.findIndex((step) => step.id === snapshot.currentStepId);
  const currentStepIndex = snapshotStepIndex >= 0 ? snapshotStepIndex : 0;
  const restored = validateState({
    ...initial,
    steps: initial.steps.map((step) => ({
      ...step,
      touched: touchedStepIds.has(step.id)
    })),
    currentStepIndex
  });
  const firstInvalidStepIndex = restored.steps.findIndex((step) => !step.validation.valid);

  if (firstInvalidStepIndex < 0) {
    return restored;
  }

  return validateState({
    ...markStepTouched(restored, firstInvalidStepIndex),
    currentStepIndex: firstInvalidStepIndex
  });
}

@Injectable({
  providedIn: 'root'
})
export class WizardService {
  private readonly stateValue = signal<WizardState>(createInitialState());

  readonly state = this.stateValue.asReadonly();
  readonly currentStep = computed(() => {
    const state = this.state();

    return state.steps[state.currentStepIndex];
  });
  readonly isFirst = computed(() => this.state().currentStepIndex === 0);
  readonly isLast = computed(() => this.state().currentStepIndex === this.state().steps.length - 1);

  updateData(updater: (data: WizardData) => WizardData): void {
    this.stateValue.update((state) =>
      validateState({
        ...state,
        data: updater(state.data)
      })
    );
  }

  replaceData(data: WizardData): void {
    this.stateValue.set(
      applySessionSnapshot({
        data,
        touchedStepIds: [],
        currentStepId: 'basis'
      })
    );
  }

  replaceSession(snapshot: WizardSessionSnapshot): void {
    this.stateValue.set(applySessionSnapshot(snapshot));
  }

  markCurrentTouched(): void {
    this.stateValue.update((state) => validateState(markStepTouched(state, state.currentStepIndex)));
  }

  goTo(index: number): void {
    this.stateValue.update((state) => {
      const safeIndex = Math.min(Math.max(index, 0), state.steps.length - 1);

      return validateState({
        ...markStepTouched(state, state.currentStepIndex),
        currentStepIndex: safeIndex
      });
    });
  }

  previous(): void {
    this.stateValue.update((state) => {
      const previousIndex = Math.max(state.currentStepIndex - 1, 0);

      return validateState({
        ...markStepTouched(state, state.currentStepIndex),
        currentStepIndex: previousIndex
      });
    });
  }

  next(): void {
    this.stateValue.update((state) => {
      const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);

      return validateState({
        ...markStepTouched(state, state.currentStepIndex),
        currentStepIndex: nextIndex
      });
    });
  }

  reset(): void {
    this.stateValue.set(createInitialState());
  }
}
