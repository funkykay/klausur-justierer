import { computed, Injectable, signal } from '@angular/core';
import type {
  ExamParticipant,
  StepId,
  WizardData,
  WizardSessionSnapshot,
  WizardState,
  WizardStep,
  WizardValidationState
} from './wizard.models';
import {
  validateAufgaben,
  validateBasis,
  validateJustierung,
  validateNotenschema,
  validateTeilnehmer
} from './wizard-validation';

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
    teilnehmer: {
      participants: [
        {
          name: 'Teilnehmer 1',
          pointsByTask: [0]
        }
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

function createDefaultParticipant(index: number, taskCount: number): ExamParticipant {
  return {
    name: `Teilnehmer ${index + 1}`,
    pointsByTask: Array.from({ length: taskCount }, () => 0)
  };
}

function createSteps(): WizardStep[] {
  return [
    {
      id: 'basis',
      title: 'Basisdaten',
      validate: validateBasis,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'aufgaben',
      title: 'Aufgaben',
      validate: validateAufgaben,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'notenschema',
      title: 'Notenschema',
      validate: validateNotenschema,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'teilnehmer',
      title: 'Teilnehmer',
      validate: validateTeilnehmer,
      touched: false,
      validation: { valid: true, errors: {} }
    },
    {
      id: 'justierung',
      title: 'Justierung',
      validate: validateJustierung,
      touched: false,
      validation: { valid: true, errors: {} }
    }
  ];
}

function normalizeData(data: WizardData): WizardData {
  const taskCount = data.aufgaben.tasks.length;
  const participants =
    data.teilnehmer.participants.length > 0
      ? data.teilnehmer.participants
      : [createDefaultParticipant(0, taskCount)];

  return {
    ...data,
    teilnehmer: {
      participants: participants.map((participant) => ({
        ...participant,
        pointsByTask: Array.from({ length: taskCount }, (_, index) => participant.pointsByTask[index] ?? 0)
      }))
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
  const data = normalizeData(state.data);
  const steps = state.steps.map((step) => ({
    ...step,
    validation: step.validate(data)
  }));

  return {
    ...state,
    data,
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
        teilnehmer: {},
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
