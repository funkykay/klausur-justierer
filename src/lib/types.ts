import type { Component } from 'svelte';

export type StepId = 'basis' | 'aufgaben' | 'notenschema' | 'justierung';

export type FieldErrors = Record<string, string[]>;

export type ValidationResult = {
  valid: boolean;
  errors: FieldErrors;
};

export type ExamTask = {
  name: string;
  maxPoints: number | null;
};

export type GradeThreshold = {
  grade: string;
  minPoints: number | null;
};

export type WizardData = {
  basis: {
    topic: string;
    course: string;
  };
  aufgaben: {
    tasks: ExamTask[];
  };
  notenschema: {
    passingPoints: number | null;
    gradeThresholds: GradeThreshold[];
  };
  justierung: {
    method: 'none' | 'bonus' | 'linear';
    bonusPoints: number | null;
    reviewer: string;
    reason: string;
  };
};

export type WizardSessionSnapshot = {
  data: WizardData;
  touchedStepIds: StepId[];
  currentStepId: StepId;
};

export type WizardStep = {
  id: StepId;
  title: string;
  view: Component;
  validate: (data: WizardData) => ValidationResult;
  touched: boolean;
  validation: ValidationResult;
};

export type WizardValidationState = {
  valid: boolean;
  errorsByStep: Record<StepId, FieldErrors>;
};

export type WizardState = {
  title: string;
  data: WizardData;
  steps: WizardStep[];
  currentStepIndex: number;
  validation: WizardValidationState;
};