import { writable } from 'svelte/store';
import { createSteps } from '../steps';
import type { StepId, WizardData, WizardState, WizardStep, WizardValidationState } from '../types';

const initialData: WizardData = {
  basis: {
    title: '',
    course: '',
    examDate: '',
    maxPoints: null,
    participantCount: null
  },
  notenschema: {
    passingPoints: null,
    gradeThresholds: [
      { grade: '1,0', minPoints: null },
      { grade: '2,0', minPoints: null },
      { grade: '3,0', minPoints: null },
      { grade: '4,0', minPoints: null }
    ]
  },
  justierung: {
    method: 'none',
    bonusPoints: null,
    capAtMaxPoints: true,
    reviewer: '',
    reason: ''
  },
  abschluss: {
    confirmed: false
  }
};

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

function createInitialState(): WizardState {
  return validateState({
    title: 'Klasur-Justierer',
    data: initialData,
    steps: createSteps(),
    currentStepIndex: 0,
    validation: {
      valid: true,
      errorsByStep: {
        basis: {},
        notenschema: {},
        justierung: {},
        abschluss: {}
      }
    },
    submitted: false
  });
}

function createWizardStore() {
  const store = writable<WizardState>(createInitialState());

  function markStepTouched(state: WizardState, index: number): WizardState {
    return {
      ...state,
      steps: state.steps.map((step, stepIndex) => ({
        ...step,
        touched: stepIndex === index ? true : step.touched
      }))
    };
  }

  return {
    subscribe: store.subscribe,

    updateData(updater: (data: WizardData) => WizardData) {
      store.update((state) =>
        validateState({
          ...state,
          data: updater(state.data),
          submitted: false
        })
      );
    },

    markCurrentTouched() {
      store.update((state) => validateState(markStepTouched(state, state.currentStepIndex)));
    },

    goTo(index: number) {
      store.update((state) => {
        const safeIndex = Math.min(Math.max(index, 0), state.steps.length - 1);

        return validateState({
          ...markStepTouched(state, state.currentStepIndex),
          currentStepIndex: safeIndex,
          submitted: false
        });
      });
    },

    previous() {
      store.update((state) => {
        const previousIndex = Math.max(state.currentStepIndex - 1, 0);

        return validateState({
          ...markStepTouched(state, state.currentStepIndex),
          currentStepIndex: previousIndex,
          submitted: false
        });
      });
    },

    next() {
      store.update((state) => {
        const nextIndex = Math.min(state.currentStepIndex + 1, state.steps.length - 1);

        return validateState({
          ...markStepTouched(state, state.currentStepIndex),
          currentStepIndex: nextIndex,
          submitted: false
        });
      });
    },

    finish() {
      store.update((state) => {
        const touchedState = {
          ...state,
          steps: state.steps.map((step) => ({
            ...step,
            touched: true
          }))
        };

        const validated = validateState(touchedState);

        return {
          ...validated,
          submitted: validated.validation.valid
        };
      });
    },

    reset() {
      store.set(createInitialState());
    }
  };
}

export const wizard = createWizardStore();