import { writable } from 'svelte/store';
import { createSteps } from '../steps';
import type { StepId, WizardData, WizardSessionSnapshot, WizardState, WizardStep, WizardValidationState } from '../types';

function createInitialData(): WizardData {
  return {
    basis: {
      topic: '',
      course: ''
    },
    aufgaben: {
      tasks: [
        {
          name: 'Aufgabe 1',
          maxPoints: 0
        }
      ]
    },
    notenschema: {
      gradeThresholds: [
        { grade: '1', minPercent: 92 },
        { grade: '2', minPercent: 81 },
        { grade: '3', minPercent: 67 },
        { grade: '4', minPercent: 50 },
        { grade: '5', minPercent: 30 },
        { grade: '6', minPercent: 0 }
      ]
    },
    justierung: {
      method: 'none',
      bonusPoints: null,
      reviewer: '',
      reason: ''
    }
  };
}

function buildValidation(steps: WizardStep[]): WizardValidationState {
  const errorsByStep = steps.reduce(
    (accumulator, step) => ({
      ...accumulator,
      [step.id]: step.validation.errors
    }),
    {} as Record<StepId, WizardValidationState['errorsByStep'][StepId]>
  );

  return {
    valid: steps.every((step) => step.validation.valid),
    errorsByStep
  };
}

function validateState(state: WizardState): WizardState {
  const steps = state.steps.map((step) => ({
    ...step,
    validation: step.validate(state.data)
  }));

  return {
    ...state,
    steps,
    validation: buildValidation(steps)
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
    title: 'Klasur-Justierer',
    data: createInitialData(),
    steps: createSteps(),
    currentStepIndex: 0,
    validation: {
      valid: true,
      errorsByStep: {
        basis: {},
        aufgaben: {},
        notenschema: {},
        justierung: {}
      }
    }
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

function createWizardStore() {
  const store = writable<WizardState>(createInitialState());

  return {
    subscribe: store.subscribe,

    updateData(updater: (data: WizardData) => WizardData) {
      store.update((state) =>
        validateState({
          ...state,
          data: updater(state.data)
        })
      );
    },

    replaceData(data: WizardData) {
      store.set(
        applySessionSnapshot({
          data,
          touchedStepIds: [],
          currentStepId: 'basis'
        })
      );
    },

    replaceSession(snapshot: WizardSessionSnapshot) {
      store.set(applySessionSnapshot(snapshot));
    },

    markCurrentTouched() {
      store.update((state) => validateState(markStepTouched(state, state.currentStepIndex)));
    },

    goTo(index: number) {
      store.update((state) => {
        const safeIndex = Math.min(Math.max(index, 0), state.steps.length - 1);

        return validateState({
          ...markStepTouched(state, state.currentStepIndex),
          currentStepIndex: safeIndex
        });
      });
    },

    previous() {
      store.update((state) => {
        const previousIndex = Math.max(state.currentStepIndex - 1, 0);

        return validateState({
          ...markStepTouched(state, state.currentStepIndex),
          currentStepIndex: previousIndex
        });
      });
    },

    next() {
      store.update((state) => {
        const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);

        return validateState({
          ...markStepTouched(state, state.currentStepIndex),
          currentStepIndex: nextIndex
        });
      });
    },

    reset() {
      store.set(createInitialState());
    }
  };
}

export const wizard = createWizardStore();